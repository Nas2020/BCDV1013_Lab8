const longLivedPaymentChannel = artifacts.require("LongLivedPaymentChannel");

module.exports = function(deployer,network,accounts) {
  deployer.deploy(longLivedPaymentChannel,accounts[0],web3.utils.toBN(200));
};
