// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
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
import { PlayerObjectID, AirObjectID, DirtObjectID, ChestObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { getBuildArgs, getMineArgs, getMoveArgs, getHitArgs, getDropArgs, getTransferArgs, getCraftArgs, getEquipArgs, getLoginArgs, getSpawnArgs } from "../utils/HookUtils.sol";
import { getSystemId, isSystemId, callBuild, callMine, callMove, callHit, callDrop, callTransfer, callCraft, callEquip, callUnequip, callLogin, callLogout, callSpawn, callActivate } from "../utils/DelegationUtils.sol";
import { hasBeforeAndAfterSystemHook, getObjectTypeAtCoord, getEntityAtCoord, getPosition, getObjectType, getMiningDifficulty, getStackable, getDamage, getDurability, isTool, isBlock, getEntityFromPlayer, getPlayerFromEntity, getEquipped, getHealth, getStamina, getIsLoggedOff, getLastHitTime, getInventoryTool, getInventoryObjects, getCount, getNumSlotsUsed, getNumUsesLeft } from "../utils/EntityUtils.sol";
import { Area, insideArea, insideAreaIgnoreY, getEntitiesInArea } from "../utils/AreaUtils.sol";
import { Build, BuildWithPos, buildExistsInWorld, buildWithPosExistsInWorld } from "../utils/BuildUtils.sol";
import { NamedArea, NamedBuild, NamedBuildWithPos, weiToString, getEmptyBlockOnGround } from "../utils/GameUtils.sol";

contract Experience is ICustomUnregisterDelegation, IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  address public guardAddress;

  // Event to show a notification in the Biomes World
  event GameNotif(address player, string message);

  VoxelCoord public guardPosition;
  VoxelCoord[] public unGuardPositions;
  address[] public allowedPlayers;

  constructor(address _biomeWorldAddress, address _guardAddress) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    guardAddress = _guardAddress;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return
      interfaceId == type(ICustomUnregisterDelegation).interfaceId ||
      interfaceId == type(IOptionalSystemHook).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    return allowedPlayers.length == 0;
  }

  function addAllowedPlayer(address player) external {
    require(msg.sender == guardAddress, "Only the guard can add players");
    for (uint i = 0; i < allowedPlayers.length; i++) {
      require(allowedPlayers[i] != player, "Player already allowed");
    }
    allowedPlayers.push(player);
  }

  function setGuardPosition(VoxelCoord memory position) external {
    require(msg.sender == guardAddress, "Only the guard can set the guard position");
    guardPosition = position;
  }

  function setUnGuardPosition(VoxelCoord[] memory positions) external {
    require(msg.sender == guardAddress, "Only the guard can set the guard position");

    // Clear the existing storage array
    delete unGuardPositions;

    // Manually copy each element from the input array to the storage array
    for (uint256 i = 0; i < positions.length; i++) {
      unGuardPositions.push(VoxelCoord({ x: positions[i].x, y: positions[i].y, z: positions[i].z }));
    }
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (isSystemId(systemId, "MoveSystem")) {
      if (msgSender == guardAddress) {
        return;
      }

      bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
      if (guardEntityId == bytes32(0)) {
        return;
      }
      // check if player is beside the guard
      VoxelCoord memory playerCoord = getPosition(getEntityFromPlayer(msgSender));
      VoxelCoord memory guardCoord = getPosition(getEntityFromPlayer(guardAddress));
      if (voxelCoordsAreEqual(guardCoord, guardPosition)) {
        if (inSurroundingCube(playerCoord, 1, guardCoord)) {
          bool isAllowed = false;
          for (uint i = 0; i < allowedPlayers.length; i++) {
            if (allowedPlayers[i] == msgSender) {
              isAllowed = true;
              break;
            }
          }
          if (!isAllowed) {
            return;
          }

          // Move the guard away from its guarding position
          callMove(biomeWorldAddress, guardAddress, unGuardPositions);
          emit GameNotif(msgSender, "Guard has moved away from its guarding position");
        }
      } else {
        // move guard back to its guarding position
        VoxelCoord[] memory newCoords = new VoxelCoord[](unGuardPositions.length);
        for (uint256 i = 0; i < newCoords.length - 1; i++) {
          newCoords[i] = unGuardPositions[i];
        }
        newCoords[unGuardPositions.length - 1] = guardPosition;
        callMove(biomeWorldAddress, guardAddress, newCoords);
        emit GameNotif(msgSender, "Guard is back at its guarding position");
      }
    } else if (isSystemId(systemId, "HitSystem")) {
      address hitAddress = getHitArgs(callData);
      if (msgSender == guardAddress) {
        bool isAllowed = false;
        for (uint i = 0; i < allowedPlayers.length; i++) {
          if (allowedPlayers[i] == hitAddress) {
            isAllowed = true;
            break;
          }
        }
        require(!isAllowed, "Guard cannot hit allowed players");
      } else {
        require(hitAddress != guardAddress, "Players cannot hit the guard");
      }
    }
  }

  function hitIntruder(address intruder) external {
    for (uint i = 0; i < allowedPlayers.length; i++) {
      require(allowedPlayers[i] != intruder, "Cannot hit allowed players");
    }
    callHit(biomeWorldAddress, guardAddress, intruder);
  }

  function getIntruders() external view returns (address[] memory) {
    bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
    if (guardEntityId == bytes32(0)) {
      return new address[](0);
    }
    VoxelCoord memory guardCoord = getPosition(guardEntityId);
    // Check all possible locations around the guard
    address[] memory allIntruders = new address[](26);
    uint intrudersCount = 0;
    for (int8 dx = -1; dx <= 1; dx++) {
      for (int8 dy = -1; dy <= 1; dy++) {
        for (int8 dz = -1; dz <= 1; dz++) {
          if (dx == 0 && dy == 0 && dz == 0) {
            continue;
          }
          VoxelCoord memory coord = VoxelCoord({ x: guardCoord.x + dx, y: guardCoord.y + dy, z: guardCoord.z + dz });
          address player = getPlayerFromEntity(getEntityAtCoord(coord));
          if (player != address(0)) {
            bool isAllowed = false;
            for (uint i = 0; i < allowedPlayers.length; i++) {
              if (allowedPlayers[i] == player) {
                isAllowed = true;
                break;
              }
            }
            if (!isAllowed) {
              allIntruders[intrudersCount] = player;
              intrudersCount++;
            }
          }
        }
      }
    }
    address[] memory intruders = new address[](intrudersCount);
    for (uint i = 0; i < intrudersCount; i++) {
      intruders[i] = allIntruders[i];
    }

    return intruders;
  }

  function getDisplayName() external view returns (string memory) {
    return "Location Guard Service";
  }

  function getStatus() external view returns (string memory) {
    bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
    if (guardEntityId == bytes32(0)) {
      return "ALERT: Guard is dead!";
    }

    bool isAllowed = false;
    for (uint i = 0; i < allowedPlayers.length; i++) {
      if (allowedPlayers[i] == msg.sender) {
        isAllowed = true;
        break;
      }
    }
    if (isAllowed) {
      return "You are allowed to go past the guard";
    } else {
      return "You are not allowed to go past the guard";
    }
  }

  function getAllowedPlayers() external view returns (address[] memory) {
    return allowedPlayers;
  }

  function getUnguardPositions() external view returns (VoxelCoord[] memory) {
    return unGuardPositions;
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
}
