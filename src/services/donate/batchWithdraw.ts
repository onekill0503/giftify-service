import { getDonateContract } from "../../utils/blockchain";

/**
 * function to execute batch withdraw if the batch withdraw amount is greater than the minimum batch withdraw amount
 * @returns {Promise<boolean>} return true if batch withdraw is successful
 */
const batchWithdraw = async (): Promise<boolean> => {
    const SmartContract = await getDonateContract();
    const withdrawStatus = await SmartContract.withdrawStatus();
    if(withdrawStatus) {
        console.log(`WITHDRAW: Batch withdraw is already in progress`)
        return false;
    };

    const batchWithdrawAmount = await SmartContract.batchWithdrawAmount();
    const batchWithdrawMin = await SmartContract.batchWithdrawMin();
    console.log(`WITHDRAW: Batch withdraw amount: ${batchWithdrawAmount}`);
    console.log(`WITHDRAW: Batch withdraw min: ${batchWithdrawMin}`);
    return false;
    if( batchWithdrawAmount < batchWithdrawMin ) {
        console.log(`WITHDRAW: Batch withdraw amount is less than the minimum batch withdraw amount`);
        return false;
    }
    const executeWithdraw = await SmartContract.batchWithdraw();
    const hash = await executeWithdraw.wait();
    console.log(`WITHDRAW: Batch withdraw executed with hash: ${hash.transactionHash}`);
    return true;
};

export default batchWithdraw;