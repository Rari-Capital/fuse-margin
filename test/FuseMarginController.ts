import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  FuseMarginV1,
  Position,
  FuseMarginController__factory,
  FuseMarginV1__factory,
  Position__factory,
  ERC20,
} from "../typechain";
import {
  fuseMarginControllerName,
  fuseMarginControllerSymbol,
  fuseMarginControllerBaseURI,
} from "../scripts/constants/constructors";
import { uniswapFactoryAddress, impersonateAddress, daiAddress } from "../scripts/constants/addresses";

describe("FuseMarginController", () => {
  let accounts: Signer[];
  let owner: Wallet;
  let attacker: Wallet;
  let fuseMarginController: FuseMarginController;
  let fuseMarginV1Factory: FuseMarginV1__factory;
  let position: Position;
  let fuseMarginV1: FuseMarginV1;
  let impersonateAddressSigner: Signer;
  let DAI: ERC20;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = <Wallet>accounts[0];
    attacker = <Wallet>accounts[1];

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      owner,
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(fuseMarginControllerBaseURI);

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
    );

    DAI = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;

    impersonateAddressSigner = await ethers.provider.getSigner(impersonateAddress);
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
    const getFuseMarginController1: string = await fuseMarginV1.fuseMarginController();
    expect(getFuseMarginController1).to.equal(fuseMarginController.address);
  });

  it("should revert if not owner", async () => {
    await expect(fuseMarginController.connect(attacker).addMarginContract(fuseMarginV1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(fuseMarginController.connect(attacker).removeMarginContract(fuseMarginV1.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(
      fuseMarginController
        .connect(attacker)
        .transferToken(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(fuseMarginController.connect(attacker).setBaseURI("")).to.be.revertedWith(
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

  it("should transfer tokens", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
    const ethDepositAmount = ethers.utils.parseEther("1");
    const daiBalance3 = await DAI.balanceOf(fuseMarginController.address);
    expect(daiBalance3).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(fuseMarginController.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(fuseMarginController.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    const ownerBalance4 = await DAI.balanceOf(owner.address);
    await fuseMarginController.transferToken(DAI.address, owner.address, ethDepositAmount);
    const daiBalance5 = await DAI.balanceOf(fuseMarginController.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5.sub(ownerBalance4)).to.equal(ethDepositAmount);
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAddress],
    });
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

  it("should create new positions", async () => {
    await fuseMarginController.addMarginContract(attacker.address);

    await expect(fuseMarginController.positions(BigNumber.from(0))).to.be.reverted;
    const getBalanceOf0 = await fuseMarginController.balanceOf(owner.address);
    expect(getBalanceOf0).to.equal(BigNumber.from(0));
    await expect(fuseMarginController.ownerOf(BigNumber.from(0))).to.be.revertedWith(
      "ERC721: owner query for nonexistent token",
    );
    const [getTokenIdsOfOwner0, getPositionsOfOwner0] = await fuseMarginController.tokensOfOwner(owner.address);
    expect(getTokenIdsOfOwner0).to.deep.equal([]);
    expect(getPositionsOfOwner0).to.deep.equal([]);
    await expect(fuseMarginController.connect(attacker).newPosition(owner.address, position.address))
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, BigNumber.from(0));
    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions1).to.equal(position.address);
    const getBalanceOf1 = await fuseMarginController.balanceOf(owner.address);
    expect(getBalanceOf1).to.equal(BigNumber.from(1));
    const getOwnerOf1 = await fuseMarginController.ownerOf(BigNumber.from(0));
    expect(getOwnerOf1).to.equal(owner.address);
    const [getTokenIdsOfOwner1, getPositionsOfOwner1] = await fuseMarginController.tokensOfOwner(owner.address);
    expect(getTokenIdsOfOwner1).to.deep.equal([BigNumber.from(0)]);
    expect(getPositionsOfOwner1).to.deep.equal([position.address]);
  });

  it("should set baseURI", async () => {
    await fuseMarginController.addMarginContract(attacker.address);
    await fuseMarginController.connect(attacker).newPosition(owner.address, position.address);
    const tokenId: BigNumber = BigNumber.from(0);

    const getTokenURI0: string = await fuseMarginController.tokenURI(tokenId);
    expect(getTokenURI0).to.equal(fuseMarginControllerBaseURI + tokenId.toString());

    const newBaseURI: string = "test";
    await expect(fuseMarginController.setBaseURI(newBaseURI))
      .to.emit(fuseMarginController, "SetBaseURI")
      .withArgs(newBaseURI);
    const getTokenURI1: string = await fuseMarginController.tokenURI(tokenId);
    expect(getTokenURI1).to.equal(newBaseURI + tokenId.toString());
  });

  it("should close positions", async () => {
    await fuseMarginController.addMarginContract(attacker.address);
    await fuseMarginController.connect(attacker).newPosition(owner.address, position.address);

    const getPositions0 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions0).to.equal(position.address);
    const getBalanceOf0 = await fuseMarginController.balanceOf(owner.address);
    expect(getBalanceOf0).to.equal(BigNumber.from(1));
    const getOwnerOf0 = await fuseMarginController.ownerOf(BigNumber.from(0));
    expect(getOwnerOf0).to.equal(owner.address);
    const [getTokenIdsOfOwner0, getPositionsOfOwner0] = await fuseMarginController.tokensOfOwner(owner.address);
    expect(getTokenIdsOfOwner0).to.deep.equal([BigNumber.from(0)]);
    expect(getPositionsOfOwner0).to.deep.equal([position.address]);
    await expect(fuseMarginController.connect(attacker).closePosition(BigNumber.from(0)))
      .to.emit(fuseMarginController, "Transfer")
      .withArgs(owner.address, ethers.constants.AddressZero, BigNumber.from(0));

    const getPositions1 = await fuseMarginController.positions(BigNumber.from(0));
    expect(getPositions1).to.equal(position.address);
    const getBalanceOf1 = await fuseMarginController.balanceOf(owner.address);
    expect(getBalanceOf1).to.equal(BigNumber.from(0));
    await expect(fuseMarginController.ownerOf(BigNumber.from(0))).to.be.revertedWith(
      "ERC721: owner query for nonexistent token",
    );
    const [getTokenIdsOfOwner1, getPositionsOfOwner1] = await fuseMarginController.tokensOfOwner(owner.address);
    expect(getTokenIdsOfOwner1).to.deep.equal([]);
    expect(getPositionsOfOwner1).to.deep.equal([]);
  });
});
