import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { garnet, mudFoundry, redstone } from "@latticexyz/common/chains";

const BIOMES_MAINNET_WORLD_ADDRESS = "0xf75b1b7bdb6932e487c4aa8d210f4a682abeacf0";
const BIOMES_TESTNET_WORLD_ADDRESS = "0x641554ed9d8a6c2c362e6c3fb2835ec2ca4da95c";

/**
 * Deploys a contract named "Game" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployGameContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();

  let useBiomesWorldAddress =
    Number(chainId) === redstone.id
      ? BIOMES_MAINNET_WORLD_ADDRESS
      : Number(chainId) === garnet.id
      ? BIOMES_TESTNET_WORLD_ADDRESS
      : "";

  if (Number(chainId) === mudFoundry.id) {
    // read local worlds.json file
    const worlds = require("../../../../biomes-contracts/packages/world/worlds.json");
    useBiomesWorldAddress = worlds[chainId].address;
  }

  if (useBiomesWorldAddress === "") {
    throw new Error("Biomes World Address not found for this chain");
  }
  console.log("useBiomesWorldAddress", useBiomesWorldAddress);

  await deploy("Game", {
    from: deployer,
    // Contract constructor arguments
    args: [
      useBiomesWorldAddress,
      {
        lowerSouthwestCorner: { x: 221, y: 40, z: -93 },
        size: { x: 3, y: 3, z: 3 },
      },
    ],
    value: "100000000000000",
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const gameContract = await hre.ethers.getContract<Contract>("Game", deployer);
  console.log("Biomes World Address:", await gameContract.biomeWorldAddress());
};

export default deployGameContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Game
deployGameContract.tags = ["Game"];
