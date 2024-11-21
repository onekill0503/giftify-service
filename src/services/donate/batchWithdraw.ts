import { getDonateContract } from "../../utils/blockchain";

/**
 * function to execute batch withdraw if the batch withdraw amount is greater than the minimum batch withdraw amount
 * @returns {Promise<boolean>} return true if batch withdraw is successful
 */
const batchWithdraw = async (): Promise<boolean> => {
    const SmartContract = await getDonateContract();
    const currentBatch = await SmartContract.currentBatch();
    const withdrawStatus = (await SmartContract.batchWithdrawAmounts(currentBatch))[2];
    if(withdrawStatus) {
        console.log(`[${new Date()}] WITHDRAW: Batch withdraw is already in progress`)
        return false;
    };

    const batchWithdrawAmount = await SmartContract.getBatchWithdrawAmount();
    const batchWithdrawMin = await SmartContract.batchWithdrawMin();
    console.log(`[${new Date()}] WITHDRAW: Batch withdraw amount: ${batchWithdrawAmount}`);
    console.log(`[${new Date()}] WITHDRAW: Batch withdraw min: ${batchWithdrawMin}`);
    if( batchWithdrawAmount < batchWithdrawMin ) {
        console.log(`[${new Date()}] WITHDRAW: Batch withdraw amount is less than the minimum batch withdraw amount`);
        return false;
    }
    console.log(`[${new Date()}] WITHDRAW: Executing batch withdraw`);
    const executeWithdraw = await SmartContract.batchWithdraw();
    const WithdrawTX = await executeWithdraw.wait();
    console.log(`[${new Date()}] WITHDRAW: Batch withdraw executed with hash: ${WithdrawTX?.hash ?? '0x'}`);
    console.log(`==================== END BATCH WITHDRAW ====================`);
    return true;
};

export default batchWithdraw;