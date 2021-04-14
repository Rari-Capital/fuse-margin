import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  FuseMarginV1,
  Position,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  Position__factory,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import { soloMarginAddress, uniswapFactoryAddress } from "../scripts/constants/addresses";

describe("FuseMarginController", () => {
  let accounts: Signer[];
  let fuseMarginController: FuseMarginController;
  let position: Position;
  let fuseMarginV1: FuseMarginV1;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      <Wallet>accounts[0],
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(
      fuseMarginControllerName,
      fuseMarginControllerSymbol,
    );

    const positionFactory: Position__factory = (await ethers.getContractFactory(
      "contracts/Position.sol:Position",
      <Wallet>accounts[0],
    )) as Position__factory;
    position = await positionFactory.deploy();
    await position.initialize(fuseMarginController.address);
    const fuseMarginV1Factory: FuseMarginV1__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginV1.sol:FuseMarginV1",
      <Wallet>accounts[0],
    )) as FuseMarginV1__factory;
    fuseMarginV1 = await fuseMarginV1Factory.deploy(
      fuseMarginController.address,
      position.address,
      uniswapFactoryAddress,
      soloMarginAddress,
    );
  });

  it("constructor should initialize state variables", async () => {
    const getName: string = await fuseMarginController.name();
    expect(getName).to.equal(fuseMarginControllerName);
    const getSymbol: string = await fuseMarginController.symbol();
    expect(getSymbol).to.equal(fuseMarginControllerSymbol);

    const fuseMarginController0 = await position.fuseMarginController();
    expect(fuseMarginController0).to.equal(fuseMarginController.address);
    const getUniswapFactory = await fuseMarginV1.uniswapFactory();
    expect(getUniswapFactory).to.equal(uniswapFactoryAddress);
    const getSoloMargin = await fuseMarginV1.soloMargin();
    expect(getSoloMargin).to.equal(soloMarginAddress);
    const getFuseMarginController1 = await fuseMarginV1.fuseMarginController();
    expect(getFuseMarginController1).to.equal(fuseMarginController.address);
    const getFuseMarginERC721 = await fuseMarginV1.fuseMarginERC721();
    expect(getFuseMarginERC721).to.equal(fuseMarginController.address);
    const getPositionImplementation = await fuseMarginV1.positionImplementation();
    expect(getPositionImplementation).to.equal(position.address);
  });
});
