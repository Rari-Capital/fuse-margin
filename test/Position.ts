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
  IWETH9,
} from "../typechain";
import { fuseMarginControllerName, fuseMarginControllerSymbol } from "../scripts/constants/constructors";
import {
  soloMarginAddress,
  uniswapFactoryAddress,
  impersonateAddress,
  wethAddress,
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
    // add return value to funcs in Position
  });

  it("should perform proxy call", async () => {
    const WETH9: IWETH9 = (await ethers.getContractAt("contracts/interfaces/IWETH9.sol:IWETH9", wethAddress)) as IWETH9;
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
});
