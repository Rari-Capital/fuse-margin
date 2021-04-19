import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";

import {
  FuseMarginController,
  FuseMarginV1,
  Position,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  Position__factory,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import { uniswapFactoryAddress } from "../scripts/constants/addresses";

async function main() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Wallet = <Wallet>accounts[0];

  const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
    "contracts/FuseMarginController.sol:FuseMarginController",
    deployer,
  )) as FuseMarginController__factory;
  const fuseMarginController: FuseMarginController = await fuseMarginControllerFactory.deploy(
    fuseMarginControllerName,
    fuseMarginControllerSymbol,
  );
  console.log("FuseMarginController:", fuseMarginController.address);
  const positionFactory: Position__factory = (await ethers.getContractFactory(
    "contracts/Position.sol:Position",
    deployer,
  )) as Position__factory;
  const position: Position = await positionFactory.deploy();
  console.log("Position:", position.address);
  await position.initialize(fuseMarginController.address);
  const fuseMarginV1Factory: FuseMarginV1__factory = (await ethers.getContractFactory(
    "contracts/FuseMarginV1.sol:FuseMarginV1",
    deployer,
  )) as FuseMarginV1__factory;
  const fuseMarginV1: FuseMarginV1 = await fuseMarginV1Factory.deploy(
    fuseMarginController.address,
    position.address,
    uniswapFactoryAddress,
  );
  console.log("FuseMarginV1:", fuseMarginV1.address);
  await fuseMarginController.addMarginContract(fuseMarginV1.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
