// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IFuseMarginController } from "./IFuseMarginController.sol";

interface IFuseMarginV1 {
    /// @dev FuseMarginController contract
    function fuseMarginController() external view returns (IFuseMarginController);

    /// @dev Position contract address
    function positionImplementation() external view returns (address);

    /// @dev Opens a new position, provided an amount of base tokens, must approve base providedAmount before calling
    /// @param providedAmount Amount of base provided
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param pair Uniswap V2 pair address to flash loan quote from
    /// @param addresses List of addresses to interact with
    ///                  [base, quote, pairToken, comptroller, cBase, cQuote, exchange]
    /// @param exchangeData Swap calldata
    /// @return tokenId of new position
    function openPosition(
        uint256 providedAmount,
        uint256 amount0Out,
        uint256 amount1Out,
        address pair,
        address[7] calldata addresses,
        bytes calldata exchangeData
    ) external returns (uint256);

    /// @dev Adds collateral to an existing position
    /// @param tokenId Position tokenId to close
    /// @param depositAmount Amount of base to add as collateral
    /// @param enterMarkets If true, markets will be entered
    /// @param base Token to add
    /// @param cBase Equivalent cToken
    /// @param comptroller Address of Comptroller for the pool
    /// @param cTokens List of cToken addresses to enable as collateral
    function addToPosition(
        uint256 tokenId,
        uint256 depositAmount,
        bool enterMarkets,
        address base,
        address cBase,
        address comptroller,
        address[] calldata cTokens
    ) external;

    /// @dev Withdraws collateral from an existing position
    /// @param tokenId Position tokenId to close
    /// @param redeemAmount Amount of base to withdraw
    /// @param base Token to withdraw
    /// @param cBase Equivalent cToken
    function withdrawFromPosition(
        uint256 tokenId,
        uint256 redeemAmount,
        address base,
        address cBase
    ) external;

    /// @dev Closes an existing position, caller must own tokenId
    /// @param tokenId Position tokenId to close
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param pair Uniswap V2 pair address to flash loan quote from
    /// @param addresses List of addresses to interact with
    ///                  [base, quote, pairToken, comptroller, cBase, cQuote, exchange]
    /// @param exchangeData Swap calldata
    function closePosition(
        uint256 tokenId,
        uint256 amount0Out,
        uint256 amount1Out,
        address pair,
        address[7] calldata addresses,
        bytes calldata exchangeData
    ) external;
}
