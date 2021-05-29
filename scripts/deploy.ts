import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";

import {
  FuseMarginController,
  FuseMarginV1,
  PositionProxy,
  ConnectorV1,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  PositionProxy__factory,
  ConnectorV1__factory,
} from "../typechain";
import { fuseMarginControllerBaseURI } from "../scripts/constants/constructors";
import { uniswapFactoryAddress } from "../scripts/constants/addresses";

async function main() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Wallet = <Wallet>accounts[0];

  const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
    "contracts/FuseMarginController.sol:FuseMarginController",
    deployer,
  )) as FuseMarginController__factory;
  const fuseMarginController: FuseMarginController = await fuseMarginControllerFactory.deploy(
    fuseMarginControllerBaseURI,
  );
  console.log("FuseMarginController:", fuseMarginController.address);
  const positionFactory: PositionProxy__factory = (await ethers.getContractFactory(
    "contracts/PositionProxy.sol:PositionProxy",
    deployer,
  )) as PositionProxy__factory;
  const position: PositionProxy = await positionFactory.deploy(fuseMarginController.address);
  console.log("PositionProxy:", position.address);
  const connectorFactory: ConnectorV1__factory = (await ethers.getContractFactory(
    "contracts/ConnectorV1.sol:ConnectorV1",
    deployer,
  )) as ConnectorV1__factory;
  const connector: ConnectorV1 = await connectorFactory.deploy();
  console.log("ConnectorV1:", connector.address);
  await fuseMarginController.addConnectorContract(connector.address);
  const fuseMarginV1Factory: FuseMarginV1__factory = (await ethers.getContractFactory(
    "contracts/FuseMarginV1.sol:FuseMarginV1",
    deployer,
  )) as FuseMarginV1__factory;
  const fuseMarginV1: FuseMarginV1 = await fuseMarginV1Factory.deploy(
    connector.address,
    uniswapFactoryAddress,
    fuseMarginController.address,
    position.address,
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
