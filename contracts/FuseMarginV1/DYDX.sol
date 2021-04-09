// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ISoloMargin } from "../interfaces/ISoloMargin.sol";
import { DYDXDataTypes } from "../libraries/DYDXDataTypes.sol";
import { Adapter } from "./Adapter.sol";

/// @author Ganesh Gautham Elango
/// @title dYdX flash loan contract
abstract contract DYDX is Adapter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // 2 wei dYdX flash loan fee
    uint256 public constant flashFee = 2;

    /// @dev DYDX flash loan callback. Receives the token amount and gives it back + a flashFee.
    /// @param sender The msg.sender to Solo
    /// @param accountInfo The account from which the data is being sent
    /// @param data Arbitrary data given by the sender
    function callFunction(
        address sender,
        DYDXDataTypes.AccountInfo memory accountInfo,
        bytes memory data
    ) external override {
        require(msg.sender == address(soloMargin), "Callback only from SoloMargin");
        require(sender == address(this), "FlashLoan only from this contract");
        // Decode arbitrary data sent from sender
        (address token, uint256 amount, bytes memory userData) = abi.decode(data, (address, uint256, bytes));

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the SoloMargin contract to pull the owed amount + flashFee
        IERC20(token).approve(address(soloMargin), amount.add(flashFee));
    }

    function getWithdrawAction(address token, uint256 amount) internal view returns (DYDXDataTypes.ActionArgs memory) {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Withdraw,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: false,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: amount
                }),
                primaryMarketId: tokenAddressToMarketId[token],
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: "" // NULL_DATA
            });
    }

    function getDepositAction(address token, uint256 repaymentAmount)
        internal
        view
        returns (DYDXDataTypes.ActionArgs memory)
    {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Deposit,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: true,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: repaymentAmount
                }),
                primaryMarketId: tokenAddressToMarketId[token],
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: "" // NULL_DATA
            });
    }

    function getCallAction(bytes memory data_) internal view returns (DYDXDataTypes.ActionArgs memory) {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Call,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: false,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: 0
                }),
                primaryMarketId: 0, // NULL_MARKET_ID
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: data_
            });
    }
}
