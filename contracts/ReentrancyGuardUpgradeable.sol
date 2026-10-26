// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice Minimal upgradeable reentrancy guard — the vendored OZ upgradeable
/// lib predates ReentrancyGuardUpgradeable, and the Transient variant needs
/// Cancun opcodes we don't assume on BOT Chain. Standard SSTORE pattern.
abstract contract ReentrancyGuardUpgradeable is Initializable {
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    function __ReentrancyGuard_init() internal onlyInitializing {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    uint256[49] private __gap;
}
