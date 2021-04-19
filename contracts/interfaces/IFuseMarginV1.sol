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
    /// @param pair Uniswap V2 pair address to flash loan quote from
    /// @param base Base token address
    /// @param quote Quote token address (will be flash loaned from Uniswap)
    /// @param pairToken The token other than quote in the Uniswap pair
    /// @param providedAmount Amount of base provided
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param fusePool Encoded fuse pool details (address comptroller, address cBase, address cQuote)
    /// @param exchangeData Encoded swap details (address exchange, bytes memory data)
    /// @return tokenId of new position
    function openPosition(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 providedAmount,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external returns (uint256);

    /// @dev Closes an existing position, caller must own tokenId
    /// @param pair Uniswap V2 pair address to flash loan base from
    /// @param base Base token address (will be flash loaned from Uniswap)
    /// @param quote Quote token address
    /// @param pairToken The token other than base in the Uniswap pair
    /// @param tokenId Position tokenId to close
    /// @param amount0Out Desired amount of token0 to borrow (0 if not being borrowed)
    /// @param amount1Out Desired amount of token1 to borrow (0 if not being borrowed)
    /// @param fusePool Encoded fuse pool details (address comptroller, address cBase, address cQuote)
    /// @param exchangeData Encoded swap details (address exchange, bytes memory data)
    function closePosition(
        IUniswapV2Pair pair,
        address base,
        address quote,
        address pairToken,
        uint256 tokenId,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata fusePool,
        bytes calldata exchangeData
    ) external;
}
