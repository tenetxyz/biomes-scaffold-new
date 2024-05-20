// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { voxelCoordsAreEqual, inSurroundingCube } from "@biomesaw/utils/src/VoxelCoordUtils.sol";

// Available utils, remove the ones you don't need
// See ObjectTypeIds.sol for all available object types
import { PlayerObjectID, AirObjectID, DirtObjectID, ChestObjectID, BedrockObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { getBuildArgs, getMineArgs, getMoveArgs, getHitArgs, getDropArgs, getTransferArgs, getCraftArgs, getEquipArgs, getLoginArgs, getSpawnArgs } from "../utils/HookUtils.sol";
import { getSystemId, isSystemId, callBuild, callMine, callMove, callHit, callDrop, callTransfer, callCraft, callEquip, callUnequip, callLogin, callLogout, callSpawn, callActivate } from "../utils/DelegationUtils.sol";
import { hasBeforeAndAfterSystemHook, getObjectTypeAtCoord, getEntityAtCoord, getPosition, getObjectType, getMiningDifficulty, getStackable, getDamage, getDurability, isTool, isBlock, getEntityFromPlayer, getPlayerFromEntity, getEquipped, getHealth, getStamina, getIsLoggedOff, getLastHitTime, getInventoryTool, getInventoryObjects, getCount, getNumSlotsUsed, getNumUsesLeft } from "../utils/EntityUtils.sol";
import { Area, insideArea, insideAreaIgnoreY, getEntitiesInArea } from "../utils/AreaUtils.sol";
import { Build, BuildWithPos, buildExistsInWorld, buildWithPosExistsInWorld } from "../utils/BuildUtils.sol";
import { NamedArea, NamedBuild, NamedBuildWithPos, weiToString, getEmptyBlockOnGround } from "../utils/GameUtils.sol";

import { IBedrockToken } from "../prototypes/IBedrockToken.sol";

struct BuildJob {
  uint256 id;
  string description;
  uint256 budget;
  address builder;
  BuildWithPos build;
}

// Bedrock DAO Contract
contract BedrockDAO is
  IOptionalSystemHook,
  Governor,
  GovernorSettings,
  GovernorCountingSimple,
  GovernorVotes,
  GovernorVotesQuorumFraction
{
  address public immutable biomeWorldAddress;
  IBedrockToken public bedrockToken;

  uint256 public bedrockTokenBuyPrice = 1 ether;

  // Event to show a notification in the Biomes World
  event GameNotif(address player, string message);

  BuildJob[] public buildJobs;
  mapping(bytes32 => address) public coordHashToBuilder;
  mapping(address => uint256) public commitedBedrock;
  uint256 public commitmentEndBlockNumber;

  constructor(
    address _biomeWorldAddress,
    IBedrockToken _token,
    address[] memory commitors,
    uint256[] memory commitments
  )
    Governor("MyGovernor")
    GovernorSettings(43200 /* 1 day */, 302400 /* 1 week */, 0)
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(4)
  {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    bedrockToken = _token;

    for (uint256 i = 0; i < commitors.length; i++) {
      commitedBedrock[commitors[i]] = commitments[i];
    }

    // 1 day = 24*60*60 = 86400 seconds, 2 second block time = 43200 blocks
    commitmentEndBlockNumber = block.number + (43200 * 30); // 30 days
  }

  function buyBedrockTokens(uint256 amount) external payable {
    require(msg.value == amount * bedrockTokenBuyPrice, "Incorrect Ether value");
    bedrockToken.mint(_msgSender(), amount);
  }

  function claimBedrockTokens() external {
    require(block.number > commitmentEndBlockNumber, "Commitment period not over");

    address msgSender = _msgSender();
    uint256 numCommitted = commitedBedrock[msgSender];
    uint256 bedrockUsed = 0;
    uint256 numRequestedBedrock = 0;
    // find all the proposals that the user has built
    uint256 amountEarned = 0;
    for (uint256 i = 0; i < buildJobs.length; i++) {
      uint256 numBedrock = 0;
      for (uint256 j = 0; j < buildJobs[i].build.objectTypeIds.length; j++) {
        if (buildJobs[i].build.objectTypeIds[j] == BedrockObjectID) {
          numBedrock++;
        }
      }
      if (buildJobs[i].builder == msgSender) {
        bedrockUsed += numBedrock;
        amountEarned += buildJobs[i].budget;
      }
      numRequestedBedrock += numBedrock;
    }
    // min of the bedrock used and the bedrock requested
    require(bedrockUsed >= numCommitted, "Not enough bedrock used to claim yet");

    // Transfer the budget to the builder
    (bool sent, ) = msgSender.call{ value: amountEarned }("");
    require(sent, "Failed to send Ether");

    // Mint 20% of the current supply
    uint256 mintAmount = bedrockToken.totalSupply() / 5;
    bedrockToken.mint(msgSender, mintAmount);

    // Update the bedrock commitment
    commitedBedrock[msgSender] = 0;
  }

  function addBuildJob(string memory description, uint256 budget, BuildWithPos memory build) external {
    require(_msgSender() == address(this), "Only the contract can add build jobs");
    require(build.objectTypeIds.length > 0, "Build must have at least one object type");
    require(
      build.objectTypeIds.length == build.relativePositions.length,
      "Object type and relative position arrays must be the same length"
    );

    // Require not an existing build
    uint256 currentTreasury = 0;
    for (uint256 i = 0; i < buildJobs.length; i++) {
      if (buildJobs[i].builder == address(0)) {
        currentTreasury += buildJobs[i].budget;
      }
      require(!voxelCoordsAreEqual(build.baseWorldCoord, buildJobs[i].build.baseWorldCoord), "Build already exists");
    }
    require(budget > 0, "Budget must be greater than 0");
    require(currentTreasury + budget <= address(this).balance, "Not enough funds in the treasury");

    uint256 proposalId = buildJobs.length;
    buildJobs.push(
      BuildJob({ id: proposalId, description: description, budget: budget, builder: address(0), build: build })
    );
  }

  function submitBuild(uint256 buildJobId) external {
    require(buildJobId < buildJobs.length, "Invalid build proposal ID");
    BuildJob storage buildJob = buildJobs[buildJobId];
    require(buildJob.builder == address(0), "Build already submitted");

    // Verify the build matches the proposal
    address msgSender = _msgSender();
    require(commitedBedrock[msgSender] > 0, "Not a commited builder");

    // Go through each relative position, aplpy it to the base world coord, and check if the object type id matches
    for (uint256 i = 0; i < buildJob.build.objectTypeIds.length; i++) {
      VoxelCoord memory absolutePosition = VoxelCoord({
        x: buildJob.build.baseWorldCoord.x + buildJob.build.relativePositions[i].x,
        y: buildJob.build.baseWorldCoord.y + buildJob.build.relativePositions[i].y,
        z: buildJob.build.baseWorldCoord.z + buildJob.build.relativePositions[i].z
      });
      bytes32 entityId = getEntityAtCoord(absolutePosition);

      uint8 objectTypeId;
      if (entityId == bytes32(0)) {
        // then it's the terrain
        objectTypeId = IWorld(biomeWorldAddress).getTerrainBlock(absolutePosition);
      } else {
        objectTypeId = getObjectType(entityId);

        address builder = coordHashToBuilder[getCoordHash(absolutePosition)];
        require(builder == msgSender, "Builder does not match");
      }
      if (objectTypeId != buildJob.build.objectTypeIds[i]) {
        revert("Build does not match");
      }
    }

    buildJob.builder = msgSender;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) public view override(Governor, IERC165) returns (bool) {
    return interfaceId == type(IOptionalSystemHook).interfaceId || super.supportsInterface(interfaceId);
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}

  function getCoordHash(VoxelCoord memory coord) internal pure returns (bytes32) {
    return bytes32(keccak256(abi.encode(coord.x, coord.y, coord.z)));
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (isSystemId(systemId, "BuildSystem")) {
      (, VoxelCoord memory coord) = getBuildArgs(callData);
      coordHashToBuilder[getCoordHash(coord)] = msgSender;
    }
  }

  function getDisplayName() external view returns (string memory) {
    return "Bedrock DAO";
  }

  function getStatus() external view returns (string memory) {
    uint256 numIncompleteBuilds = 0;
    for (uint256 i = 0; i < buildJobs.length; i++) {
      if (buildJobs[i].builder == address(0)) {
        numIncompleteBuilds++;
      }
    }
    return string.concat("There are ", Strings.toString(numIncompleteBuilds), " build jobs pending");
  }

  // The following functions are overrides required by Solidity.

  function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.votingDelay();
  }

  function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.votingPeriod();
  }

  function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
    return super.quorum(blockNumber);
  }

  function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.proposalThreshold();
  }
}
