// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

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
import { Area, insideArea } from "../utils/AreaUtils.sol";
import { getEntityFromPlayer, getPosition } from "../utils/EntityUtils.sol";

contract Game is IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  Area private prizeArea;
  bool public isGameOver = false;
  address public winner;

  event GameNotif(address player, string message);

  constructor(address _biomeWorldAddress, Area memory initialArea) payable {
    biomeWorldAddress = _biomeWorldAddress;

    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    prizeArea = initialArea;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IOptionalSystemHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {
    require(!isGameOver, "Game is already over.");
    require(getEntityFromPlayer(msgSender) != bytes32(0), "Player entity not found in Biome world");
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (isGameOver) {
      return;
    }

    VoxelCoord memory playerPosition = getPosition(getEntityFromPlayer(msgSender));

    if (insideArea(prizeArea, playerPosition)) {
      isGameOver = true;
      winner = msgSender;

      (bool sent, ) = msgSender.call{ value: address(this).balance }("");
      require(sent, "Failed to send Ether");

      return;
    }

    return;
  }

  function getMatchArea() external view returns (Area memory) {
    return prizeArea;
  }

  function getWinner() external view returns (address) {
    return winner;
  }

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
