import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  PositionProxy,
  ConnectorV1,
  FuseMarginController__factory,
  PositionProxy__factory,
  ConnectorV1__factory,
  IERC20,
  ERC20,
  CErc20Interface,
  ComptrollerInterface,
  IWETH9,
} from "../typechain";
import { fuseMarginControllerBaseURI } from "../scripts/constants/constructors";
import {
  usdcAddress,
  impersonateAddress,
  wethAddress,
  daiAddress,
  fusePool4,
  fr4USDCAddress,
  fr4DAIAddress,
} from "../scripts/constants/addresses";

describe("ConnectorV1", () => {
  let accounts: Signer[];
  let owner: Wallet;
  let attacker: Wallet;
  let position: PositionProxy;
  let connector: ConnectorV1;
  let fuseMarginController: FuseMarginController;
  let impersonateAddressSigner: Signer;
  let DAI: ERC20;
  let USDC: ERC20;
  let WETH9: IWETH9;
  let fr4DAI: CErc20Interface;
  let fr4USDC: CErc20Interface;
  let FusePool4: ComptrollerInterface;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = <Wallet>accounts[0];
    attacker = <Wallet>accounts[1];

    const fuseMarginControllerFactory: FuseMarginController__factory = (await ethers.getContractFactory(
      "contracts/FuseMarginController.sol:FuseMarginController",
      owner,
    )) as FuseMarginController__factory;
    fuseMarginController = await fuseMarginControllerFactory.deploy(fuseMarginControllerBaseURI);

    const positionFactory: PositionProxy__factory = (await ethers.getContractFactory(
      "contracts/PositionProxy.sol:PositionProxy",
      owner,
    )) as PositionProxy__factory;
    position = await positionFactory.deploy(fuseMarginController.address);
    const connectorFactory: ConnectorV1__factory = (await ethers.getContractFactory(
      "contracts/ConnectorV1.sol:ConnectorV1",
      owner,
    )) as ConnectorV1__factory;
    connector = await connectorFactory.deploy();
    await fuseMarginController.addConnectorContract(connector.address);
    await fuseMarginController.addMarginContract(attacker.address);

    WETH9 = (await ethers.getContractAt("contracts/interfaces/IWETH9.sol:IWETH9", wethAddress)) as IWETH9;
    DAI = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;
    USDC = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress)) as ERC20;
    fr4DAI = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4DAIAddress,
    )) as CErc20Interface;
    fr4USDC = (await ethers.getContractAt(
      "contracts/interfaces/CErc20Interface.sol:CErc20Interface",
      fr4USDCAddress,
    )) as CErc20Interface;
    FusePool4 = (await ethers.getContractAt(
      "contracts/interfaces/ComptrollerInterface.sol:ComptrollerInterface",
      fusePool4,
    )) as ComptrollerInterface;

    impersonateAddressSigner = await ethers.provider.getSigner(impersonateAddress);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
  });

  afterEach(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAddress],
    });
  });

  it("should initialize", async () => {
    const getMarginContracts: string = await fuseMarginController.marginContracts(BigNumber.from(0));
    expect(getMarginContracts).to.equal(attacker.address);
    const getGetMarginContracts: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts).to.deep.equal([attacker.address]);
    const getApprovedContracts: boolean = await fuseMarginController.approvedContracts(attacker.address);
    expect(getApprovedContracts).to.equal(true);

    const getFuseMarginController0: string = await position.fuseMarginController();
    expect(getFuseMarginController0).to.equal(fuseMarginController.address);
  });

  it("should revert if not margin contract", async () => {
    await expect(position["execute(address,bytes)"](ethers.constants.AddressZero, "0x")).to.be.revertedWith(
      "PositionProxy: Not approved contract",
    );
  });

  it("should transfer ETH and tokens", async () => {
    const ethBalance0 = await ethers.provider.getBalance(position.address);
    expect(ethBalance0).to.equal(BigNumber.from(0));
    const ethDepositAmount = ethers.utils.parseEther("1");
    await owner.sendTransaction({ to: position.address, value: ethDepositAmount });
    const ethBalance1 = await ethers.provider.getBalance(position.address);
    expect(ethBalance1).to.equal(ethDepositAmount);
    const transferETHCall: string = connector.interface.encodeFunctionData("transferETH", [
      owner.address,
      ethDepositAmount,
    ]);
    await position.connect(attacker)["execute(address,bytes)"](connector.address, transferETHCall);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));

    const daiBalance3 = await DAI.balanceOf(position.address);
    expect(daiBalance3).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(position.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(position.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    const ownerBalance4 = await DAI.balanceOf(owner.address);
    const transferTokenCall: string = connector.interface.encodeFunctionData("transferToken", [
      DAI.address,
      owner.address,
      ethDepositAmount,
    ]);
    await position.connect(attacker)["execute(address,bytes)"](connector.address, transferTokenCall);
    const daiBalance5 = await DAI.balanceOf(position.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5.sub(ownerBalance4)).to.equal(ethDepositAmount);
  });
});
