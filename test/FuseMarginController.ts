import { ethers } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
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
  let owner: Wallet;
  let attacker: Wallet;
  let fuseMarginController: FuseMarginController;
  let fuseMarginV1Factory: FuseMarginV1__factory;
  let position: Position;
  let fuseMarginV1: FuseMarginV1;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = <Wallet>accounts[0];
    attacker = <Wallet>accounts[1];

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      owner,
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(
      fuseMarginControllerName,
      fuseMarginControllerSymbol,
    );

    const positionFactory: Position__factory = (await ethers.getContractFactory(
      "contracts/Position.sol:Position",
      owner,
    )) as Position__factory;
    position = await positionFactory.deploy();
    await position.initialize(fuseMarginController.address);
    fuseMarginV1Factory = (await ethers.getContractFactory(
      "contracts/FuseMarginV1.sol:FuseMarginV1",
      owner,
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
    const getOwner: string = await fuseMarginController.owner();
    expect(getOwner).to.equal(owner.address);
    const getMarginContracts: string[] = await fuseMarginController.getMarginContracts();
    expect(getMarginContracts).to.deep.equal([]);
    const [getTokensOfOwner, getPositionsOfOwner]: [BigNumber[], string[]] = await fuseMarginController.tokensOfOwner(
      owner.address,
    );
    expect(getTokensOfOwner).to.deep.equal([]);
    expect(getPositionsOfOwner).to.deep.equal([]);

    const fuseMarginController0: string = await position.fuseMarginController();
    expect(fuseMarginController0).to.equal(fuseMarginController.address);
    const getUniswapFactory: string = await fuseMarginV1.uniswapFactory();
    expect(getUniswapFactory).to.equal(uniswapFactoryAddress);
    const getSoloMargin: string = await fuseMarginV1.soloMargin();
    expect(getSoloMargin).to.equal(soloMarginAddress);
    const getFuseMarginController1: string = await fuseMarginV1.fuseMarginController();
    expect(getFuseMarginController1).to.equal(fuseMarginController.address);
    const getFuseMarginERC721: string = await fuseMarginV1.fuseMarginERC721();
    expect(getFuseMarginERC721).to.equal(fuseMarginController.address);
    const getPositionImplementation: string = await fuseMarginV1.positionImplementation();
    expect(getPositionImplementation).to.equal(position.address);
  });

  it("should revert if not owner", async () => {
    await expect(fuseMarginController.connect(attacker).addMarginContract(fuseMarginV1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(fuseMarginController.connect(attacker).removeMarginContract(fuseMarginV1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert if not margin contract", async () => {
    await expect(
      fuseMarginController.connect(attacker).newPosition(attacker.address, attacker.address),
    ).to.be.revertedWith("FuseMarginController: Not approved contract");
    await expect(fuseMarginController.connect(attacker).closePosition(BigNumber.from(0))).to.be.revertedWith(
      "FuseMarginController: Not approved contract",
    );
  });

  it("should add margin contracts", async () => {
    await expect(fuseMarginController.marginContracts(BigNumber.from(0))).to.be.reverted;
    const getApprovedContract0: boolean = await fuseMarginController.approvedContracts(fuseMarginV1.address);
    expect(getApprovedContract0).to.equal(false);
    await expect(fuseMarginController.addMarginContract(fuseMarginV1.address))
      .to.emit(fuseMarginController, "AddMarginContract")
      .withArgs(fuseMarginV1.address, owner.address);
    const getMarginContracts1: string = await fuseMarginController.marginContracts(BigNumber.from(0));
    expect(getMarginContracts1).to.equal(fuseMarginV1.address);
    const getApprovedContract1: boolean = await fuseMarginController.approvedContracts(fuseMarginV1.address);
    expect(getApprovedContract1).to.equal(true);
    const getGetMarginContracts1: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts1).to.deep.equal([fuseMarginV1.address]);
    await expect(fuseMarginController.addMarginContract(fuseMarginV1.address)).to.be.revertedWith(
      "FuseMarginController: Already exists",
    );

    const fuseMarginV10: FuseMarginV1 = await fuseMarginV1Factory.deploy(
      fuseMarginController.address,
      position.address,
      uniswapFactoryAddress,
      soloMarginAddress,
    );
    await expect(fuseMarginController.marginContracts(BigNumber.from(1))).to.be.reverted;
    const getApprovedContract2: boolean = await fuseMarginController.approvedContracts(fuseMarginV10.address);
    expect(getApprovedContract2).to.equal(false);
    await expect(fuseMarginController.addMarginContract(fuseMarginV10.address))
      .to.emit(fuseMarginController, "AddMarginContract")
      .withArgs(fuseMarginV10.address, owner.address);
    const getMarginContracts3: string = await fuseMarginController.marginContracts(BigNumber.from(1));
    expect(getMarginContracts3).to.equal(fuseMarginV10.address);
    const getApprovedContract3: boolean = await fuseMarginController.approvedContracts(fuseMarginV10.address);
    expect(getApprovedContract3).to.equal(true);
    const getGetMarginContracts3: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts3).to.deep.equal([fuseMarginV1.address, fuseMarginV10.address]);
    await expect(fuseMarginController.addMarginContract(fuseMarginV10.address)).to.be.revertedWith(
      "FuseMarginController: Already exists",
    );
  });

  it("should remove margin contracts", async () => {
    await fuseMarginController.addMarginContract(fuseMarginV1.address);
    const fuseMarginV10: FuseMarginV1 = await fuseMarginV1Factory.deploy(
      fuseMarginController.address,
      position.address,
      uniswapFactoryAddress,
      soloMarginAddress,
    );
    await expect(fuseMarginController.removeMarginContract(fuseMarginV10.address)).to.be.revertedWith(
      "FuseMarginController: Does not exist",
    );
    await fuseMarginController.addMarginContract(fuseMarginV10.address);
    const getMarginContracts0: string = await fuseMarginController.marginContracts(BigNumber.from(1));
    expect(getMarginContracts0).to.equal(fuseMarginV10.address);
    const getApprovedContract0: boolean = await fuseMarginController.approvedContracts(fuseMarginV10.address);
    expect(getApprovedContract0).to.equal(true);
    const getGetMarginContracts0: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts0).to.deep.equal([fuseMarginV1.address, fuseMarginV10.address]);
    await expect(fuseMarginController.removeMarginContract(fuseMarginV10.address))
      .to.emit(fuseMarginController, "RemoveMarginContract")
      .withArgs(fuseMarginV10.address, owner.address);
    const getMarginContracts1: string = await fuseMarginController.marginContracts(BigNumber.from(1));
    expect(getMarginContracts1).to.equal(fuseMarginV10.address);
    const getApprovedContract1: boolean = await fuseMarginController.approvedContracts(fuseMarginV10.address);
    expect(getApprovedContract1).to.equal(false);
    const getGetMarginContracts1: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts1).to.deep.equal([fuseMarginV1.address]);
    await expect(fuseMarginController.removeMarginContract(fuseMarginV10.address)).to.be.revertedWith(
      "FuseMarginController: Does not exist",
    );
  });
});
