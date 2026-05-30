// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../contracts/AICOIN.sol";
import "../contracts/PaymentVerifier.sol";
import "../contracts/P2PEscrow.sol";
import "../contracts/MultiModelRouter.sol";
import "../contracts/WithdrawalManager.sol";
import "../contracts/BatchPaymentRouter.sol";
import "../contracts/AICBridge.sol";

contract Factory {
    address public paymentVerifier;
    address public p2pEscrow;
    address public multiModelRouter;
    address public withdrawalManager;
    address public batchPaymentRouter;
    address public aicBridge;
    
    constructor(address _aicoin, address _companyRegistry, address _modelRegistry, address _paymentRouter) {
        paymentVerifier = address(new PaymentVerifier());
        p2pEscrow = address(new P2PEscrow(_aicoin, paymentVerifier));
        multiModelRouter = address(new MultiModelRouter(_modelRegistry));
        withdrawalManager = address(new WithdrawalManager(_aicoin, _companyRegistry));
        batchPaymentRouter = address(new BatchPaymentRouter(_paymentRouter));
        aicBridge = address(new AICBridge(_aicoin, address(0)));
    }
}

contract DeployAllNew is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        Factory f = new Factory(
            0xcb0402629AF93ac8205736c771ACB5e842357f66,
            0x22386a826027f8522A19E17282471752FA3F8a9b,
            0x021aa2761aD177b97e311775d219615F2A4aC3cc,
            0xa4269ceD2c6AE4DF387086970dba7543e5c7e130
        );
        console.log("PaymentVerifier:", f.paymentVerifier());
        console.log("P2PEscrow:", f.p2pEscrow());
        console.log("MultiModelRouter:", f.multiModelRouter());
        console.log("WithdrawalManager:", f.withdrawalManager());
        console.log("BatchPaymentRouter:", f.batchPaymentRouter());
        console.log("AICBridge:", f.aicBridge());
        vm.stopBroadcast();
    }
}
