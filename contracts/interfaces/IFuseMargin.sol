// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

interface IFuseMargin {
    function openPosition(
        address fusePool,
        address base,
        address quote,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 flashLoanProvider,
        bool baseProvided,
        bytes calldata params
    ) external returns (uint256);

    function closePosition(
        uint256 tokenId,
        address fusePool,
        address base,
        address quote,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 flashLoanProvider,
        bool baseProvided,
        bytes calldata params
    ) external returns (uint256);
}
