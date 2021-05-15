import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import {
  FuseMarginController,
  PositionV1,
  FuseMarginController__factory,
  PositionV1__factory,
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

describe("PositionV1", () => {
  let accounts: Signer[];
  let owner: Wallet;
  let attacker: Wallet;
  let position: PositionV1;
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

    const positionFactory: PositionV1__factory = (await ethers.getContractFactory(
      "contracts/PositionV1.sol:PositionV1",
      owner,
    )) as PositionV1__factory;
    position = await positionFactory.deploy();
    await position.initialize(fuseMarginController.address);
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
    const positionVersion0: BigNumber = await position.version();
    expect(positionVersion0.toString()).to.equal("0");
    await expect(position.initialize(attacker.address)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("should revert if not margin contract", async () => {
    await expect(position.proxyCall(ethers.constants.AddressZero, "0x")).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.proxyMulticall([ethers.constants.AddressZero], ["0x"])).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.delegatecall(ethers.constants.AddressZero, "0x")).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.transferETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.transferToken(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.mint(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.enterMarkets(ethers.constants.AddressZero, [])).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.borrow(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.repayBorrow(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.redeemUnderlying(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.mintAndBorrow(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.repayAndRedeem(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
  });

  it("should perform proxy call", async () => {
    const wethBalance0 = await WETH9.balanceOf(position.address);
    expect(wethBalance0).to.equal(BigNumber.from(0));
    const wethDepositCall: string = WETH9.interface.encodeFunctionData("deposit");
    const wethDepositAmount = ethers.utils.parseEther("1");
    await position.connect(attacker).proxyCall(WETH9.address, wethDepositCall, { value: wethDepositAmount });
    const wethBalance1 = await WETH9.balanceOf(position.address);
    expect(wethBalance1).to.equal(wethDepositAmount);

    const wethWithdrawCall: string = WETH9.interface.encodeFunctionData("withdraw", [wethDepositAmount]);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));
    await position.connect(attacker).proxyCall(WETH9.address, wethWithdrawCall);
    const wethBalance3 = await WETH9.balanceOf(position.address);
    expect(wethBalance3).to.equal(BigNumber.from(0));
    const ethBalance3 = await ethers.provider.getBalance(position.address);
    expect(ethBalance3).to.equal(wethDepositAmount);
  });

  it("should perform proxy multi call", async () => {
    const wethBalance0 = await WETH9.balanceOf(position.address);
    expect(wethBalance0).to.equal(BigNumber.from(0));
    const wethDepositCall: string = WETH9.interface.encodeFunctionData("deposit");
    const wethDepositAmount = ethers.utils.parseEther("1");
    await position.connect(attacker).proxyCall(WETH9.address, wethDepositCall, { value: wethDepositAmount });
    const wethBalance1 = await WETH9.balanceOf(position.address);
    expect(wethBalance1).to.equal(wethDepositAmount);

    const wethTransferAmount = wethDepositAmount.div(2);
    const wethTransferCall: string = WETH9.interface.encodeFunctionData("transfer", [
      owner.address,
      wethTransferAmount,
    ]);
    const wethWithdrawCall: string = WETH9.interface.encodeFunctionData("withdraw", [wethTransferAmount]);
    const ownerBalance2 = await WETH9.balanceOf(owner.address);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));
    await position
      .connect(attacker)
      .proxyMulticall([WETH9.address, WETH9.address], [wethTransferCall, wethWithdrawCall]);
    const ownerBalance3 = await WETH9.balanceOf(owner.address);
    expect(ownerBalance2.add(wethTransferAmount)).to.equal(ownerBalance3);
    const wethBalance3 = await WETH9.balanceOf(position.address);
    expect(wethBalance3).to.equal(BigNumber.from(0));
    const ethBalance3 = await ethers.provider.getBalance(position.address);
    expect(ethBalance3).to.equal(wethTransferAmount);
  });

  it("should transfer ETH and tokens", async () => {
    const ethBalance0 = await ethers.provider.getBalance(position.address);
    expect(ethBalance0).to.equal(BigNumber.from(0));
    const ethDepositAmount = ethers.utils.parseEther("1");
    await owner.sendTransaction({ to: position.address, value: ethDepositAmount });
    const ethBalance1 = await ethers.provider.getBalance(position.address);
    expect(ethBalance1).to.equal(ethDepositAmount);
    await position.connect(attacker).transferETH(owner.address, ethDepositAmount);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));

    const daiBalance3 = await DAI.balanceOf(position.address);
    expect(daiBalance3).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(position.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(position.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    const ownerBalance4 = await DAI.balanceOf(owner.address);
    await position.connect(attacker).transferToken(DAI.address, owner.address, ethDepositAmount);
    const daiBalance5 = await DAI.balanceOf(position.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5.sub(ownerBalance4)).to.equal(ethDepositAmount);
  });

  it("should mint tokens", async () => {
    const fr4USDCToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4USDC.address,
    )) as IERC20;
    const fr4USDCBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCBalance0).to.equal(BigNumber.from(0));
    const fr4USDCTokenBalance0 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    const usdcBalance0 = await USDC.balanceOf(position.address);
    expect(usdcBalance0).to.equal(mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    const fr4USDCBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCBalance1).to.be.gt(fr4USDCBalance0);
    const fr4USDCTokenBalance1 = await fr4USDCToken.balanceOf(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    const usdcBalance1 = await USDC.balanceOf(position.address);
    expect(usdcBalance1).to.equal(BigNumber.from(0));
  });

  it("should enter markets", async () => {
    const comptrollerMarkets0 = await FusePool4.getAssetsIn(position.address);
    expect(comptrollerMarkets0).to.deep.equal([]);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);
    const comptrollerMarkets1 = await FusePool4.getAssetsIn(position.address);
    expect(comptrollerMarkets1).to.deep.equal([fr4USDC.address]);
  });

  it("should borrow tokens", async () => {
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);

    const daiBalance2 = await DAI.balanceOf(attacker.address);
    const fr4DAIBalance2 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance2).to.equal(BigNumber.from(0));
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position.connect(attacker).borrow(DAI.address, fr4DAI.address, attacker.address, borrowAmountDAI);
    const daiBalance3 = await DAI.balanceOf(attacker.address);
    expect(daiBalance3.sub(daiBalance2)).to.equal(borrowAmountDAI);
    const fr4DAIBalance3 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance3).to.equal(borrowAmountDAI);
  });

  it("should repay borrow tokens", async () => {
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    await position.connect(attacker).enterMarkets(FusePool4.address, [fr4USDC.address]);
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position.connect(attacker).borrow(DAI.address, fr4DAI.address, attacker.address, borrowAmountDAI);

    const daiBalance2 = await DAI.balanceOf(position.address);
    expect(daiBalance2).to.equal(BigNumber.from(0));
    await DAI.connect(impersonateAddressSigner).transfer(position.address, borrowAmountDAI);
    const daiBalance3 = await DAI.balanceOf(position.address);
    expect(daiBalance3).to.equal(borrowAmountDAI);
    const fr4DAIBalance3 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance3).to.be.gte(borrowAmountDAI);
    await position.connect(attacker).repayBorrow(DAI.address, fr4DAI.address, borrowAmountDAI);
    const fr4DAIBalance4 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance4).to.be.lt(borrowAmountDAI);
  });

  it("should redeem underlying of tokens", async () => {
    const fr4USDCTokenBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    await position.connect(attacker).mint(USDC.address, fr4USDC.address, mintAmountUSDC);
    const fr4USDCTokenBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    await position
      .connect(attacker)
      .redeemUnderlying(USDC.address, fr4USDC.address, attacker.address, fr4USDCTokenBalance1);
    const fr4USDCTokenBalance2 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance2).to.be.lt(fr4USDCTokenBalance1);
    const USDCBalance2 = await USDC.balanceOf(attacker.address);
    expect(USDCBalance2).to.be.gte(fr4USDCTokenBalance1);
  });

  it("should mint and borrow", async () => {
    const fr4USDCTokenBalance0 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance0).to.equal(BigNumber.from(0));
    const mintAmountUSDC = ethers.utils.parseUnits("100000", await USDC.decimals());
    await USDC.connect(impersonateAddressSigner).transfer(position.address, mintAmountUSDC);
    const fr4DAIBalance0 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance0).to.equal(BigNumber.from(0));
    const DAIBalance0 = await DAI.balanceOf(attacker.address);
    const borrowAmountDAI = ethers.utils.parseUnits("10000", await DAI.decimals());
    await position
      .connect(attacker)
      .mintAndBorrow(
        FusePool4.address,
        USDC.address,
        fr4USDC.address,
        DAI.address,
        fr4DAI.address,
        mintAmountUSDC,
        borrowAmountDAI,
      );
    const fr4USDCTokenBalance1 = await fr4USDC.balanceOfUnderlying(position.address);
    expect(fr4USDCTokenBalance1).to.be.gt(fr4USDCTokenBalance0);
    const fr4DAIBalance1 = await fr4DAI.borrowBalanceStored(position.address);
    expect(fr4DAIBalance1).to.equal(borrowAmountDAI);
    const DAIBalance1 = await DAI.balanceOf(attacker.address);
    expect(DAIBalance1).to.equal(DAIBalance0.add(borrowAmountDAI));
  });

  it("should repay and redeem", async () => {
    const mintAmountDAI = ethers.utils.parseUnits("100000", await DAI.decimals());
    await DAI.connect(impersonateAddressSigner).transfer(position.address, mintAmountDAI);
    const borrowAmountUSDC = ethers.utils.parseUnits("10000", await USDC.decimals());
    await position
      .connect(attacker)
      .mintAndBorrow(
        FusePool4.address,
        DAI.address,
        fr4DAI.address,
        USDC.address,
        fr4USDC.address,
        mintAmountDAI,
        borrowAmountUSDC,
      );
    const frDAIToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      fr4DAI.address,
    )) as IERC20;
    const frDAIBalance1 = await frDAIToken.balanceOf(position.address);
    const redeemAmount1 = frDAIBalance1.div(2);
    const daiBalance1 = await DAI.balanceOf(attacker.address);
    const frUSDCBalance1 = await fr4USDC.borrowBalanceStored(position.address);
    await USDC.connect(impersonateAddressSigner).transfer(position.address, frUSDCBalance1);
    await position
      .connect(attacker)
      .repayAndRedeem(DAI.address, fr4DAI.address, USDC.address, fr4USDC.address, redeemAmount1, frUSDCBalance1);
    const frDAIBalance2 = await frDAIToken.balanceOf(position.address);
    expect(frDAIBalance2).to.be.lt(frDAIBalance1);
    const daiBalance2 = await DAI.balanceOf(attacker.address);
    expect(daiBalance2).to.gt(daiBalance1);
    const frUSDCBalance2 = await fr4USDC.borrowBalanceStored(position.address);
    expect(frUSDCBalance2).to.be.lt(frUSDCBalance1);
  });
});
