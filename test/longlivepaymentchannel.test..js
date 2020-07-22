const LongLivedPaymentChannel = artifacts.require("LongLivedPaymentChannel");

contract(
  "Recipient should be able to withdraw amount and then close",
  (accounts) => {
    // declare all global variables here
    let contractInstance;
    let contractAddress;
    let longLivedPaymentChannelTx;
    const skey =
      "dec072ad7e4cf54d8bce9ce5b0d7e95ce8473a35f6ce65ab414faea436a2ee86"; // private key
    web3.eth.accounts.wallet.add(`0x${skey}`);
    const masterAccount = accounts[0];
    const sender = web3.eth.accounts.wallet[0].address;
    const senderSkey = web3.eth.accounts.wallet[0].privateKey;
    const recipient = accounts[1];
    const closeDuration = 200;
    const depositAmount = web3.utils.toWei("2", "ether");
    // sender can open the channel (deploy contract and deposit funds)
    before(async () => {
      await web3.eth.sendTransaction({
        from: masterAccount,
        to: sender,
        value: web3.utils.toWei("5", "ether"),
        gas: 21000,
      });
      contractInstance = new web3.eth.Contract(LongLivedPaymentChannel.abi);
      const gas = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          from: sender,
          value: depositAmount,
          arguments: [recipient, closeDuration],
        })
        .estimateGas();
      longLivedPaymentChannelTx = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          arguments: [recipient, closeDuration],
        })
        .send({
          from: sender,
          gas,
          value: depositAmount,
        });
      contractAddress = longLivedPaymentChannelTx.options.address;
      const actualSender = await longLivedPaymentChannelTx.methods
        .sender()
        .call({
          from: recipient,
        });
      const actualRecipient = await longLivedPaymentChannelTx.methods
        .recipient()
        .call({
          from: accounts[2],
        });
      const actualCloseDuration = await longLivedPaymentChannelTx.methods
        .closeDuration()
        .call({
          from: accounts[2],
        });
      const actualDepositedAmount = await web3.eth.getBalance(contractAddress);
      // assertions
      assert.equal(actualSender, sender, "Sender is not as expected");
      assert.equal(
        actualDepositedAmount,
        depositAmount,
        "The deposited amount is as expected"
      );
      assert.equal(actualRecipient, recipient, "The recipient is as expected");
      assert.equal(
        actualCloseDuration,
        closeDuration,
        "closeDuration is not as expected"
      );
    });

    it("should be able to withdraw from the channel", async () => {
      // code that will sign for recipient to withdraw
      // code that will use this sign as well as recipient as caller of `withdraw` function
      // the recipient should be able to close the channel
      // make necessary assertions to validate balance of sender and recipient

      let dpAmount = web3.utils.toWei("1", "ether");
      let msg = web3.utils.soliditySha3(
        { t: "address", v: contractAddress },
        { t: "uint256", v: dpAmount }
      );
      let sign = await web3.eth.accounts.sign(msg, senderSkey);
      let finalSign = sign.signature;
      let bal_1 = await web3.eth.getBalance(recipient);
      let withdrawTx = await longLivedPaymentChannelTx.methods
        .withdraw(dpAmount, finalSign)
        .send({ from: recipient });
      let bal_2 = await web3.eth.getBalance(recipient);
      let tx = await web3.eth.getTransaction(withdrawTx.transactionHash);
      let tx_Fee = web3.utils
        .toBN(tx.gasPrice)
        .mul(web3.utils.toBN(withdrawTx.gasUsed));
      let final_bal = web3.utils
        .toBN(bal_1)
        .add(web3.utils.toBN(dpAmount))
        .sub(web3.utils.toBN(tx_Fee));
      assert.equal(
        final_bal,
        bal_2,
        `Recipient Balance is ${bal_2}, instead of ${final_bal}`
      );
    });

    it("should able to close the channel", async () => {
      await web3.eth.sendTransaction({
        from: masterAccount,
        to: sender,
        value: web3.utils.toWei("5", "ether"),
        gas: 21000,
      });
      contractInstance = new web3.eth.Contract(LongLivedPaymentChannel.abi);
      let gas = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          from: sender,
          value: depositAmount,
          arguments: [recipient, closeDuration],
        })
        .estimateGas();
       longLivedPaymentChannelTx = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          arguments: [recipient, closeDuration],
        })
        .send({
          from: sender,
          gas,
          value: depositAmount,
        });
      contractAddress = longLivedPaymentChannelTx.options.address;
      const senderBal_2 = await web3.eth.getBalance(sender);
       dpAmount = web3.utils.toWei("1", "ether");
       msg = web3.utils.soliditySha3(
        { t: "address", v: contractAddress },
        { t: "uint256", v: dpAmount }
      );
       sign = await web3.eth.accounts.sign(msg, senderSkey);
       finalSign = sign.signature;
      let rec_bal_1 = await web3.eth.getBalance(recipient);
      const closeTx = await longLivedPaymentChannelTx.methods
        .close(dpAmount, finalSign)
        .send({ from: recipient });
      let rec_bal_2 = await web3.eth.getBalance(recipient);
      const senderBal = await web3.eth.getBalance(sender);
      const tx = await web3.eth.getTransaction(closeTx.transactionHash);
      const tx_Fee = web3.utils
        .toBN(tx.gasPrice)
        .mul(web3.utils.toBN(closeTx.gasUsed));
      let final_bal = web3.utils
        .toBN(rec_bal_1)
        .add(web3.utils.toBN(dpAmount))
        .sub(web3.utils.toBN(tx_Fee));
      assert.equal(
        final_bal,
        rec_bal_2,
        `Recipient balance is ${rec_bal_2}, instead of ${final_bal}`
      );
      let senderFinalBal = web3.utils
        .toBN(senderBal_2)
        .add(web3.utils.toBN(web3.utils.toWei("1", "ether")));
      assert.equal(
        senderFinalBal,
        senderBal,
        `Sender balance is ${senderBal}, instead of ${senderFinalBal}`
      );
    });
  }
);