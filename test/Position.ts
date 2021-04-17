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
  IERC20,
  IWETH9,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import {
  soloMarginAddress,
  uniswapFactoryAddress,
  impersonateAddress,
  wethAddress,
  daiAddress,
} from "../scripts/constants/addresses";

describe("Position", () => {
  let accounts: Signer[];
  let owner: Wallet;
  let attacker: Wallet;
  let position: Position;
  let fuseMarginController: FuseMarginController;
  let impersonateAddressSigner: Signer;

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
    await fuseMarginController.addMarginContract(attacker.address);

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
    const getName: string = await fuseMarginController.name();
    expect(getName).to.equal(fuseMarginControllerName);
    const getSymbol: string = await fuseMarginController.symbol();
    expect(getSymbol).to.equal(fuseMarginControllerSymbol);
    const getOwner: string = await fuseMarginController.owner();
    expect(getOwner).to.equal(owner.address);
    const getMarginContracts: string = await fuseMarginController.marginContracts(BigNumber.from(0));
    expect(getMarginContracts).to.equal(attacker.address);
    const getGetMarginContracts: string[] = await fuseMarginController.getMarginContracts();
    expect(getGetMarginContracts).to.deep.equal([attacker.address]);
    const getApprovedContracts: boolean = await fuseMarginController.approvedContracts(attacker.address);
    expect(getApprovedContracts).to.equal(true);
    const [getTokensOfOwner, getPositionsOfOwner]: [BigNumber[], string[]] = await fuseMarginController.tokensOfOwner(
      owner.address,
    );
    expect(getTokensOfOwner).to.deep.equal([]);
    expect(getPositionsOfOwner).to.deep.equal([]);

    const getFuseMarginController0: string = await position.fuseMarginController();
    expect(getFuseMarginController0).to.equal(fuseMarginController.address);
    await expect(position.initialize(attacker.address)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("should revert if not margin contract", async () => {
    await expect(position.proxyCall(ethers.constants.AddressZero, "0x")).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.transferToken(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.transferETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.mint(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.mintETH(ethers.constants.AddressZero, { value: BigNumber.from(0) })).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.enterMarkets(ethers.constants.AddressZero, [])).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(position.exitMarket(ethers.constants.AddressZero, ethers.constants.AddressZero)).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.borrow(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.borrowETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.repayBorrow(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.repayBorrowETH(ethers.constants.AddressZero)).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.redeem(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.redeemETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
    await expect(
      position.redeemUnderlying(ethers.constants.AddressZero, ethers.constants.AddressZero, BigNumber.from(0)),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(position.redeemUnderlyingETH(ethers.constants.AddressZero, BigNumber.from(0))).to.be.revertedWith(
      "Position: Not approved contract",
    );
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
      position.mintETHAndBorrow(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        BigNumber.from(0),
      ),
    ).to.be.revertedWith("Position: Not approved contract");
    await expect(
      position.mintAndBorrowETH(
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
    const WETH9: IWETH9 = (await ethers.getContractAt("contracts/interfaces/IWETH9.sol:IWETH9", wethAddress)) as IWETH9;
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

  it("should approve tokens", async () => {
    const DAI: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      daiAddress,
    )) as IERC20;
    const daiApproval0 = await DAI.allowance(position.address, owner.address);
    expect(daiApproval0).to.equal(BigNumber.from(0));
    const ethDepositAmount = ethers.utils.parseEther("1");
    await position.connect(attacker).approveToken(DAI.address, owner.address, ethDepositAmount);
    const daiApproval1 = await DAI.allowance(position.address, owner.address);
    expect(daiApproval1).to.equal(ethDepositAmount);
  });

  it("should transfer ETH and tokens", async () => {
    const ethDepositAmount = ethers.utils.parseEther("1");
    await owner.sendTransaction({ to: position.address, value: ethDepositAmount });
    const ethBalance1 = await ethers.provider.getBalance(position.address);
    expect(ethBalance1).to.equal(ethDepositAmount);
    await position.connect(attacker).transferETH(owner.address, ethDepositAmount);
    const ethBalance2 = await ethers.provider.getBalance(position.address);
    expect(ethBalance2).to.equal(BigNumber.from(0));

    const DAI: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      daiAddress,
    )) as IERC20;
    await DAI.connect(impersonateAddressSigner).transfer(position.address, ethDepositAmount);
    const daiBalance4 = await DAI.balanceOf(position.address);
    expect(daiBalance4).to.equal(ethDepositAmount);
    await position.connect(attacker).transferToken(DAI.address, owner.address, ethDepositAmount);
    const daiBalance5 = await DAI.balanceOf(position.address);
    expect(daiBalance5).to.equal(BigNumber.from(0));
    const ownerBalance5 = await DAI.balanceOf(owner.address);
    expect(ownerBalance5).to.equal(ethDepositAmount);
  });
});
