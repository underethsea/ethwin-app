import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";

import Modal from "react-modal";
import "./modal.css";
import { Timer } from "./timer";
import CountUp from "react-countup";

import { GetSubgraphData } from "./graphData";
import { ethers } from "ethers";
import {
  chain,
  useAccount,
  useConnect,
  useContract,
  // useContractRead,
  usePrepareContractWrite,
  useContractWrite,
  useNetwork,
  useWaitForTransaction,
  useSigner,
} from "wagmi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { CONTRACT } from "./contractConnect.jsx";
import { ADDRESS } from "./address.jsx";
import { ABI } from "./abi.jsx";

// hardcoded for now
const stEthYield = 0.05;

const BNZERO = ethers.BigNumber.from("0")
const BNONEWEI = ethers.BigNumber.from("1")

const ethValue = (amount) => {
  return ethers.utils.formatUnits(amount, 18);
};

// number w commas
function separator(numb) {
  numb = numb.toFixed(0);
  var str = numb.split(".");
  str[0] = str[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return str.join(".");
}


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


// possible prize still to accrue before award based on tvl, yield, and time remaining
function estimatePrize(tvl, secondsRemaining) {
  secondsRemaining = 86400 * 5 + 1000;
  let daysRemaining = parseInt(secondsRemaining / 86400);
  let estimate = tvl * (stEthYield * (daysRemaining / 365));
  // console.log("estimated prize ", estimate);
  return estimate;
}

// crappy decimal formatting
function numberChop(biginput) {
  let number = Number(biginput);
  if (number > 100000) {
    return number.toFixed(0);
  } else if (number > 100) {
    return number.toFixed(4);
  } else if (number > 1) {
    return number.toFixed(2);
  } else if (number > 0.01) {
    return number.toFixed(4);
  } else if (number > 0.00001) {
    return number.toFixed(8);
  } else if (number > 0.00000001) {
    return number.toFixed(11);
  } else if (number > 0.0000000001) {
    return number.toFixed(13);
  } else {
    return biginput;
  }
}

// haha
function decimalsForCount(number) {
  number = Number(number);
  if (number > 100000) {
    return 2;
  } else if (number > 1000) {
    return 4;
  } else if (number > 1) {
    return 6;
  } else if (number > 0.01) {
    return 8;
  } else if (number > 0.00001) {
    return 10;
  } else if (number > 0.00000001) {
    return 13;
  } else if (number > 0.0000000001) {
    return 15;
  } else {
    return 16;
  }
}

// for accessing constants by chain id
function chainObject(chainId) {
  try {
    if (chainId) chainId = chainId.id;
    if (chainId === 5) {
      return "GOERLI";
    } else if (chainId === 1) {
      return "ETHEREUM";
    } else {
      console.log("chain not recognized", chainId);
      return "ETHEREUM";
    }
  } catch (error) {
    console.log("chain set to ethereum on error");
    return "ETHEREUM";
  }
}

function Dapp() {
 
  // get users balances
  async function getBalance(address) {
    try {
      // console.log(chainObject(chain), "fetching balances");

      let [
        stethBalance,
        ethwinBalance,
        spEthWinBalance,
      ] = await Promise.all([
        CONTRACT[chainObject(chain)].STETH.balanceOf(address),
        CONTRACT[chainObject(chain)].ETHWIN.balanceOf(address),
        CONTRACT[chainObject(chain)].SPETHWIN.balanceOf(address),
        
      ]);

      let balances = {
        steth: stethBalance,
        ethwin: ethwinBalance,
        spethwin: spEthWinBalance,
      };

      // console.log("balances fetched ", balances);
      let balanceArray = [balances];
      return balanceArray;
    } catch (error) {
      console.log("error fetching balances", error);
      return [{ steth: BNZERO, ethwin: BNZERO, spethwin: BNZERO }];
    }
  }

  async function getPoolStats() {
    console.log(chainObject(chain), "getting pool stats");
    let [
      prizePoolBalance,
      spethwinTotalSupply,
      ethwinTotalSupply,
      prizePeriodRemainingSeconds,
    ] = await Promise.all([
      CONTRACT[chainObject(chain)].STETH.balanceOf(
        ADDRESS[chainObject(chain)].PRIZEPOOL
      ),
      CONTRACT[chainObject(chain)].SPETHWIN.totalSupply(),
      CONTRACT[chainObject(chain)].ETHWIN.totalSupply(),
      CONTRACT[chainObject(chain)].PRIZESTRATEGY.prizePeriodRemainingSeconds(),
    ]);

    let poolStats = {
      prizepool: ethValue(prizePoolBalance),
      ethwinTotalSupply: ethValue(ethwinTotalSupply),
      spethwinTotalSupply: ethValue(spethwinTotalSupply),
      remainingSeconds: parseInt(prizePeriodRemainingSeconds),
    };
    // console.log("stats", poolStats);
    return poolStats;
  }

  const {
    connector: activeConnector,
    address,
    isConnecting,
    isDisconnected,
    isConnected,
  } = useAccount({
    onConnect({ address, connector, isReconnected }) {
      console.log("Connected", { address, connector, isReconnected });
    },
  });

  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const signer = useSigner();

  const [balances, setBalances] = useState([
    { steth: BNZERO, ethwin: BNZERO, spethwin: BNZERO },
  ]);
  const [poolInfo, setPoolInfo] = useState({});
  const [prizeMap, setPrizeMap] = useState([]);
  const [addressValue, setAddressValue] = useState("");
  const [popup, setPopup] = useState(Boolean);
  const [graphInfo, setGraphInfo] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFocus, setModalFocus] = useState("claim");
  const [allowances, setAllowances] = useState({});

  const [inputAmount, setInputAmount] = useState("");
  const [validAddress, setValidAddress] = useState(true);
  const [prizePoolAddress, setPrizePoolAddress] = useState(
    "0x79Bc8bD53244bC8a9C8c27509a2d573650A83373"
  );
  const [stethAddress, setStethAddress] = useState(
    "0x79Bc8bD53244bC8a9C8c27509a2d573650A83373"
  );
  const [updateWallet, setUpdateWallet] = useState(0);
  const [walletMessage, setWalletMessage] = useState(""); // lousy bug-fix for setPoolerToWallet not getting poolerAddress useEffect to trigger
  const amountInput = useCallback((inputElement) => {
    if (inputElement) {
      inputElement.focus();
    }
  }, []);
  // const {refresh, setRefresh} = useState(0)

  const { chain, chains } = useNetwork();

  async function openWallet() {
    setModalFocus("wallet");
    setIsModalOpen(true);
    setInputAmount("");
  }
  async function openWalletWithdraw() {
    setModalFocus("withdrawWallet");
    setIsModalOpen(true);
    setInputAmount("");
  }

  async function openAward() {
    setModalFocus("award");
    setIsModalOpen(true);
  }
  async function openModal() {
    setIsModalOpen(true);
  }
  async function closeModal() {
    setIsModalOpen(false);
  }
  // console.log("rendered")
  // console.log(graphInfo?.data?.controlledTokenBalances)
  // console.log(prizeDistributor)
  // console.log(balances);
  // console.log("ethwinbalance", balances[0].ethwin);
  // console.log("chain", chain);
  // console.log("isconnected", isConnected);
  // console.log(address)
  // console.log(allowances);
  console.log(chain)

  const isInvalidInputAmt = (amt) => {
    const inputAmt = Number(amt);
    return Number.isNaN(inputAmt) || inputAmt <= 0;
  };


  // function isValidAddress(addressToVerify) {
  //   try {
  //     if (ethers.utils.isAddress(addressToVerify)) {
  //       // console.log("valid address: ",addressToVerify)
  //       setValidAddress(true);
  //       return true;
  //     } else {
  //       console.log("invalid address: ", addressToVerify);
  //       setValidAddress(false);
  //       return false;
  //     }
  //   } catch (error) {
  //     console.log("invalid address catch: ", addressToVerify);
  //     setValidAddress(false);
  //     return false;
  //   }
  // }

  const amountFormatForSend = (amt) => {
    if (Number(amt) != amt) {
      return "0";
    } else {
      if (parseFloat(amt) > 0) {
        // console.log(
        //   "amount formatted",
        //   ethers.utils.parseUnits(amt.toString(), 18).toString()
        // );
        return ethers.utils.parseUnits(amt, 18);
        // return ethers.BigNumber.from(ethers.utils.parse)
      } else {
        return "0";
      }
    }
  };

  async function getWinners() {
    console.log("getting winners");
    let data = await GetSubgraphData("ETHEREUM");
    setGraphInfo(data);
    console.log("got graph info", data);
    let winnerMap = data.data.prizePools[0].prizes.reverse()
    winnerMap = winnerMap[0].awardedControlledTokens
    console.log(winnerMap)
    setPrizeMap(winnerMap);
    setModalFocus("winners");
    setIsModalOpen(true);
  }

  // TODO needs work
  async function calculateExitFee(exitFeeAddress, exitFeeDeposit) {
    console.log(
      "exit feee calc fetch",
      exitFeeAddress,
      ADDRESS[chainObject(chain)].ETHWIN,
      exitFeeDeposit
    );
    let exitFee = await CONTRACT[
      chainObject(chain)
    ].PRIZEPOOL.callStatic.calculateEarlyExitFee(
      exitFeeAddress,
      ADDRESS[chainObject(chain)].ETHWIN,
      exitFeeDeposit
    );
    // console.log("exitfee", exitFee[1].toString()) // index 0 is burned credit - 1 is exit fee
    // exitFee = parseInt(exitFee[1]) * 1.05
    // return exitFee.toString();
    console.log("fee", exitFee.exitFee.toString());
    return exitFee.exitFee.toString();
  }

  // calculateExitFee(address, amountFormatForSend(inputAmount))

  // ------ WITHDRAW TRANSACTION CONFIG -------- //  

  const { config: withdrawConfig, error: withdrawConfigError } =
    usePrepareContractWrite({
      args: [
        address,
        amountFormatForSend(inputAmount),
        ADDRESS[chainObject(chain)].ETHWIN,
        amountFormatForSend(inputAmount),
      ],
      addressOrName: ADDRESS[chainObject(chain)].PRIZEPOOL,
      contractInterface: ABI.PRIZEPOOL,
      functionName: "withdrawInstantlyFrom",
      // overrides: {
      //   gasLimit: 625000,
      // },
    });
  
  // ------ DEPOSIT TRANSACTION CONFIG -------- //  
  const {
    config: depositConfig,
    error: depositConfigError,
    isError: isDepositConfigError,
  } = usePrepareContractWrite({
    args: [
      address,
      amountFormatForSend(inputAmount),
      ADDRESS[chainObject(chain)].ETHWIN,
      "0x0000000000000000000000000000000000000000",
    ],
    addressOrName: ADDRESS[chainObject(chain)].PRIZEPOOL,
    contractInterface: ABI.PRIZEPOOL,
    functionName: "depositTo",
    // overrides: {
    //   gasLimit: 625000,
    // },
  });

  // ------ APPROVE TRANSACTION CONFIG -------- //
  const {
    config: stethConfig,
    error: stethConfigError,
    isError: stethConfigIsError,
  } = usePrepareContractWrite({
    args: [
      ADDRESS[chainObject(chain)].PRIZEPOOL,
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    ],
    addressOrName: ADDRESS[chainObject(chain)].STETH,
    contractInterface: ABI.ERC20,
    functionName: "approve",
  });

  const {
    write: approveWrite,
    isSuccess: approveSuccess,
    status: approveStatus,
    error: approveError,
    isLoading: approveLoading,
    data: approveData,
    isIdle: approveIdle,
    isError: isApproveError,
  } = useContractWrite(stethConfig);

  const {
    write: depositWrite,
    error: depositError,
    isError: isDepositError,
    isIdle: depositIdle,
    data: depositData,
    isSuccess: depositSuccess,
    isLoading: depositLoading,
  } = useContractWrite(depositConfig);

  const {
    write: withdrawWrite,
    error: withdrawError,
    isError: isWithdrawError,
    isIdle: withdrawIdle,
    data: withdrawData,
    isSuccess: withdrawSuccess,
    isLoading: withdrawLoading,
  } = useContractWrite(withdrawConfig);

  const { isFetching: approveFetching, isLoading: approveWaitLoading, isSuccess: approveWaitSuccess } =
    useWaitForTransaction({
      hash: approveData?.hash,
      onSuccess(data) {
        toast("Approve success!", {
          position: toast.POSITION.BOTTOM_RIGHT,
        });
        console.log("Approve success waiting over", data);
      },
    });

  const {
    isFetching: withdrawFetching,
    isLoading: withdrawWaitLoading,
    isSuccess: withdrawWaitSuccess,
  } = useWaitForTransaction({
    hash: withdrawData?.hash,
    onSuccess(data) {
      toast("Withdraw success!", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
      closeModal();
      console.log("Withdraw success waiting over", data);
    },
  });

  const {
    isFetching: depositFetching,
    isError: depositWaitError,
    isLoading: depositWaitLoading,
    isSuccess: depositWaitSuccess,
  } = useWaitForTransaction({
    hash: depositData?.hash,
    onSuccess(data) {
      closeModal();
      toast("Deposit success!", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
      console.log("Deposit success waiting over", data);
    },
    onError(error) {
      toast("Deposit error", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
      console.log("Deposit error", error);
    },
  });

  function GetStethNow() {
    if (balances[0] !== undefined) {
      if (
        isConnected &&
        balances[0].steth === BNZERO &&
        balances[0].ethwin === BNZERO
      ) {
        return (
          <div>
            <span className="get-token">WANNA WIN? GET stETH <a href="https://app.uniswap.org">
              <span title="Uniswap"><img src="images/uniswap.png" className="token-icon"/></span></a>
              <span title="Lido"><a href="https://stake.lido.fi/"><img src="images/lido.png" className="lido-icon"></img></a></span>
              </span>
          </div>
        );
      } else {
        return null;
      }
    }
  }

  function DepositButton() {
    if (balances[0] !== undefined) {
      // console.log(balances);
      return (
        isConnected && (
          <span>
            {balances[0].steth.gt(BNZERO) && (
              <span>
                <span
                  className="open-wallet"
                  onClick={() => {
                    openWallet();
                  }}
                >
                  &nbsp;
                  <span className="actionButton display-not-block">
                    DEPOSIT NOW
                  </span>
                  &nbsp;
                </span>
              </span>
            )}
          </span>
        )
      );
    } else {
      return null;
    }
  }

  function WithdrawButton() {
    if (balances[0] !== undefined) {
      return (
        isConnected && (
          <span>
            {balances[0].ethwin.gt(BNZERO)  && (
              <span
                className="open-wallet"
                onClick={() => {
                  openWalletWithdraw();
                }}
              >
                &nbsp;
                <span className="actionButton display-not-block">WITHDRAW</span>
                &nbsp;
              </span>
            )}
          </span>
        )
      );
    } else {
      return null;
    }
  }
  // function AwardButton() {
  //   if (isNaN(parseInt(graphInfo?.data?.prizePools[0].currentPrizeId))) {
  //     return (

  //         <span className="open-wallet" onClick={() => { openAward(); }}>&nbsp;
  //           <span className="actionButton display-not-block">AWARD PRIZE</span>&nbsp;

  //     </span>
  //     )
  //   } else { return null }
  // }

  const approve = () => {
    try {
      approveWrite();
      toast("Approving!", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
    } catch (error) {
      setWalletMessage("error, see console");
      console.log(error);
    }
  };

  const depositTo = async () => {
    console.log("input amt ",inputAmount)
    console.log("deposit amounts balance",balances[0].steth," ",balances[0].steth.toString()," ",ethers.utils.parseUnits(inputAmount,18))
    try {
      if (balances[0].steth.lt(ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount,18)))) {
        setWalletMessage("insufficient balance");
      }
      // else if (parseFloat(inputAmount) < 2) { setWalletMessage("2 usdc minimum") }
      else if (
        ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount,18)).lt(BNONEWEI) 
      ) {
        setWalletMessage("amount invalid");
      } else {
        const rngStatus = await CONTRACT[
          chainObject(chain)
        ].PRIZESTRATEGY.isRngRequested();
        if (!rngStatus) {
          setUpdateWallet(updateWallet + 1);
          try {
            depositWrite();
            toast("Depositing!", {
              position: toast.POSITION.BOTTOM_RIGHT,
            });
          } catch (error) {
            console.log(error);
          }
        } else {
          setWalletMessage("prize is being awarded");
          console.log("prize in progress");
        }

        // console.log(depositError)
      }
    } catch (error) {
      setWalletMessage("error, see console");
      console.log(error);
    }
  };

  const withdrawFrom = async () => {
    try {
      let withdrawBalance = 0;
      console.log("withdraw balance", balances[0].ethwin);
      if (balances[0].ethwin === undefined) {
      } else {
        console.log("set to ", withdrawBalance);
      }
      if (balances[0].ethwin.lt(ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount,18)))) {
        setWalletMessage("insufficient balance");
      } else if (
        ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount,18)).lt(BNONEWEI) 
      ) {
        setWalletMessage("amount invalid");
      } else {
        const rngStatus = await CONTRACT[
          chainObject(chain)
        ].PRIZESTRATEGY.isRngRequested();
        if (!rngStatus) {
          withdrawWrite();
        } else {
          setWalletMessage("prize is being awarded");
          console.log("prize is being awarded");
        }
      }
    } catch (error) {
      setWalletMessage("error, see console");
      console.log(error);
    }
  };

  // const handleChange = (selectedOption) => {
  //   setAddressValue(selectedOption.target.value);
  //   try {
  //     if (isValidAddress(selectedOption.target.value)) {
  //       // console.log(`Address input: `, selectedOption);}
  //     } else {
  //     }
  //   } catch (error) {
  //     console.log("invalid address ");
  //   }
  // };

  useEffect(() => {
    const getApprovals = async () => {
      if (modalFocus === "wallet" && address) {
        console.log("fetching approvals");
        let [stethApproval] = await Promise.all([
          CONTRACT[chainObject(chain)].STETH.allowance(
            address,
            ADDRESS[chainObject(chain)].PRIZEPOOL
          ),
        ]);
        setAllowances({
          steth: stethApproval,
        });
      }
    };
    getApprovals();
  }, [modalFocus, approveWaitSuccess, depositWaitSuccess, withdrawWaitSuccess]);

  useEffect(() => {
    const loadPage = async () => {
      let poolStats = await getPoolStats();
      setPoolInfo(poolStats);

      // removed subgraph for now
      // let data = await GetSubgraphData("ETHEREUM");
      // setGraphInfo(data);
    };
    loadPage();
  }, [chain]);

  useEffect(() => {
    console.log("chain change");
    const goGetPlayer = async () => {
      if (isConnected) {
        setPopup(true);
        // const currentTimestamp = parseInt(Date.now() / 1000);
        console.log("getting player ", address);
        let poolerBalances = await getBalance(address);

        setBalances(poolerBalances);
        setPopup(false);
      }
    };
    if (isConnected) {
      console.log("getting pooler");
      goGetPlayer();
    }
  }, [
    address,
    chain,
    isConnected,
    updateWallet,
    approveWaitSuccess,
    depositWaitSuccess,
    withdrawWaitSuccess,
  ]);

  return (
    <div className="dapp">
      <div>
        {" "}
        <br></br>
        {
          <div className="card-content">
            <center><div className="padding-top">
              {/* <div className="table-wrapper has-mobile-cards tablemax"> */}
                <table className="middle-table top-table">
                  
                    <tr>
                      <td>
                        <center><div className="padding-top">
                          {/* <img src="images/trophyeth.png" className="trophy"></img>&nbsp; */}
                          <span className="top-title">
                          <div class="top-title-text">WEEKLY WINNING</div>
                          <img src="/images/ethbrand.png" className="eth-title"></img>

                            {/* Prize value */}
                            {/* <img
                              src="/images/trophy.png"
                              className="trophy"
                            ></img> */}
                            &nbsp;
                            {!isNaN(poolInfo.prizepool) &&
                              numberChop(
                                poolInfo.prizepool -
                                  poolInfo.ethwinTotalSupply -
                                  poolInfo.spethwinTotalSupply +
                                  estimatePrize(
                                    poolInfo.prizepool,
                                    poolInfo.remainingSeconds
                                  )
                              )}
                            {/* {!isNaN(poolInfo.prizepool) && <CountUp start={0}
                            end={numberChop(
                              poolInfo.prizepool -
                                poolInfo.ethwinTotalSupply -
                                poolInfo.spethwinTotalSupply +
                                estimatePrize(
                                  poolInfo.prizepool,
                                  poolInfo.remainingSeconds
                                )
                            )}
                            delay = {3}
                            decimal="."
                            decimals={decimalsForCount(poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + estimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds))} 
                            >{({ countUpRef, start }) => (
                              <span>
                                <span ref={countUpRef} />
                                </span>
                            )}
                          </CountUp>} */}
                            {/* <CountUp
                                        start={poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + estimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds)}
                                        end={0.00012057} duration={86400} separator=" "
                                        decimals={decimalsForCount(poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + estimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds))} 
                                        delay = {0} decimal="."
                                        // prefix="EUR "
                                        // suffix=" left"
                                        onEnd={() => console.log('Ended! 👏')}
                                        // onStart={() => console.log('Started! 💨')}
                                      > 
                                        {({ countUpRef, start }) => (
                                          <span>
                                            <span ref={countUpRef} />
                                            </span>
                                        )}
                                      </CountUp> */}
                          </span></div>
                         
                          <div className="padding-bottom">
                          {/* <span class="timer-text">WEEKLY WINNING</span>  */}
                          {!isNaN(poolInfo?.remainingSeconds) &&
                            <Timer seconds={Date.now() + (poolInfo?.remainingSeconds * 1000)} />

                            // <Timer seconds={Date.now() + poolInfo?.remainingSeconds * 1000} />
                                           
                          }
                          </div>
                        </center>
                      </td>
                    </tr>

                    {/* Current Draw: {graphInfo?.data?.prizePools[0].currentPrizeId}<br></br> */}
                    {/* Prize Period Ends: {graphInfo?.data?.multipleWinnersPrizeStrategies[0].prizePeriodEndAt}   */}
                    {/* 
                    <tr>
                      <td className="tdcenter">
                        <img src="./images/yolo_nolo.png" className="cool-pooly" alt="POOLY" />
                        </td>
                    </tr> */}
                    {/* https://i.ibb.co/0Jgj6DL/pooly44.png */}
                    {/* {addressValue === "" ? <tr>
                    <td className="tdcenter"><img src="./ images/yolo_nolo.png" className="cool-pooly" /></td></tr> : ""} */}

                    {/* {prizesWon === 0 && !popup && addressValue !== "" && <tr><td className="tdcenter">
                     No wins yet, friend.<br/> 
                    <img src="./images/yolo_nolo.png" className="cool-pooly" /></td></tr>} */}
                  
                  {/* <table className="padded bottom-table"><thead><tr><td><center>
                    <br></br></center> </td></tr></thead></table>*/}
                </table>
<br></br>
                <table className=" middle-table">
                  <tr>
                    <td style={{ textAlign: "left" }}>
                      {" "}
                      <center>
                        <table className="inner-middle-table">
                          <tr>
                            <td>
                              <center>
                                {/* TODO if they have no stETH embed or link to swap */}
                                <span className="text-two">
                                  Staked ETH tokens are pooled
                                </span>

                                {/* <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> */}

                                <br></br>
                                <span className="text-two">
                                  ETH yield creates weekly winners
                                </span>

                                <br></br>
                                <span className="text-two">
                                  50% to a good cause<br></br>50% to two
                                  {/* {
                            graphInfo?.data?.multipleWinnersPrizeStrategies[0]
                              .numberOfWinners
                          }
                           */}
                                  &nbsp;random poolers
                                </span>

                                <br></br>
                                <span className="text-four">
                                  Withdraw in full anytime after 7 days
                                </span>
                              </center>
                            </td>
                          </tr>
                        </table>
                      </center>

                      {/* Alternate Lingo
                      Staked ETH tokens are pooled
                      With ETH yield everyone wins
                      50% to a protocol specified charity
                      50% to two lucky winners per week
                      Withdraw in full anytime after 7 days */}

                      {/* <img
                          src="images/moreinfo.png"
                          className="more-info"
                        ></img>&nbsp;<span className="info-text">MORE INFO</span> */}
                    </td>
                  </tr>
                </table>
                {/* 
                        {parseInt(graphInfo?.data?.prizePools[0].currentPrizeId) > 0 && <span><br></br>
                       
                          Sponsors:<br></br>
                          {graphInfo?.data.controlledTokenBalances.map((sponsor) => (
                            <tr>
                              <td>{sponsor.account.id}</td>
                              <td>{ethValue(sponsor.balance)}</td>
                            </tr>
                          ))}
                          
                        </span>} */}
                <br></br>
                
                {isConnected && (
                  <div className="bottom-table ">
                    <table className="padded">
                        <th>
                          {" "}
                          <center>
                            {popup && (
                              <span>
                                &nbsp;&nbsp;
                                <div
                                  className="smallLoader"
                                  style={{ display: "inline-block" }}
                                ></div>
                              </span>
                            )}

                            <table className="wallet-table top-padded">
                              <div className="padding-top"></div>
                              {/* {!isConnected && <span className="right-float">Connect your wallet amigo</span>} */}

                              {isConnected &&
                                balances[0].steth.gt(BNZERO) && (
                                  <tr>
                                    <td>
                                      <span className="token-text">STETH</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      {" "}
                                      <img
                                        src="/images/steth.png"
                                        className="token"
                                      ></img>
                                      &nbsp;
                                      <span className="token-text">{numberChop(ethers.utils.formatUnits(balances[0].steth,18))}</span>
                                    </td>
                                  </tr>
                                )}

                              {isConnected && 
                                balances[0].ethwin.gt(BNZERO) && (
                                  <tr>
                                    <td>
                                      <span className="token-text">ETHWIN</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <img
                                        src="/images/trophy.png"
                                        className="trophy-token"
                                      ></img>
                                      &nbsp;
                                      <span className="token-text">{numberChop(ethers.utils.formatUnits(balances[0].ethwin,18))}</span>
                                    </td>
                                  </tr>
                                )}

                              {isConnected && balances[0].spethwin.gt(BNZERO) && (
                                <tr>
                                  <td><span className="token-text">SPETHWIN</span></td>
                                  <td style={{ textAlign: "right" }}>
                                  <img
                                        src="/images/trophy.png"
                                        className="trophy-token"
                                      ></img>
                                      &nbsp;
                                      <span className="token-text">{numberChop(ethers.utils.formatUnits(balances[0].spethwin,18))}</span>
                                  </td>
                                </tr>
                              )}
                            </table>
                          </center>
                        </th>
                   
                    </table>
                    <table className="bottom-table padded bottom-table">
                    
                        <tr>
                          <td>
                            <center>
                              <div className="wallet-buttons padding-bottom">
                                <GetStethNow />
                                <DepositButton />
                                <WithdrawButton />
                              </div>
                            </center>{" "}
                          </td>
                        </tr>
                      
                    </table>
                    </div>
                
                    
                )}
           </div>
            </center>
          </div>
          
        }
      </div>
      <Modal
        isOpen={isModalOpen}
        style={{
          overlay: {
            position: "fixed",
            margin: "auto",
            top: "10%",
            borderRadius: 10,
            width: 400,
            height: 300,
            backgroundColor: "#343368",
            color: "black",
          },
          content: { inset: "34px" },
        }}
      >
        <center>
          <div className="closeModal close" onClick={() => closeModal()}></div>

          {modalFocus === "wallet" && (
            <div>
              <div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>
              {!isConnected && "Please connect wallet"}

              {isConnected && (
                <>
                  {" "}
                  DEPOSIT on
                  {/* <img
              src={"./images/" + chain.name.toLowerCase() + ".png"}
              className="emoji"
              alt={chain.name}
            /> */}
                  <img
                    src={"./images/ethereum.png"}
                    className="emoji"
                    alt={chain.name}
                  />
                  {chain.name}
                  <br></br>
                  {allowances.steth !== undefined && (
                    <div className="amount-container">
                      <table className="table-inputamount">
                        <tr>
                          <td>
                            <img
                              src="./images/steth.png"
                              className="icon"
                              alt="STETH"
                            />{" "}
                            STETH &nbsp;
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="wallet-message">
                              {walletMessage !== "" && walletMessage}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2}>
                            <input
                              type="text"
                              className="amount-input"
                              value={inputAmount}
                              ref={amountInput}
                              onChange={(e) => {
                                setWalletMessage("");
                                setInputAmount(e.target.value);
                              }}
                            ></input>
                          </td>
                        </tr>

                        <tr>
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <span className="small-balance">
                              Balance {numberChop(ethers.utils.formatUnits(balances[0].steth,18))}
                              {balances[0].steth.gt(BNZERO) && (
                                <span
                                  className="max-balance"
                                  onClick={(e) =>
                                    setInputAmount(ethers.utils.formatUnits(balances[0].steth,18))
                                  }
                                >
                                  &nbsp;MAX
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  )}
                  {depositFetching || approveFetching ? (
                    <span>
                      <span>
                        <span className="pending-text">
                          TRANSACTION PENDING
                        </span>
                        &nbsp;&nbsp;
                        <div
                          className="verySmallLoader"
                          style={{ display: "inline-block" }}
                        ></div>
                      </span>
                    </span>
                  ) : depositLoading || approveLoading ? (
                    <span>
                      <span className="pending-text">PENDING CONFIRMATION</span>
                      &nbsp;&nbsp; &nbsp;&nbsp;
                      <div
                        className="verySmallLoader"
                        style={{ display: "inline-block" }}
                      ></div>
                    </span>
                  ) : 
                  
                  parseFloat(allowances.steth) / 1e6 >=
                      parseFloat(Number(inputAmount)) &&
                    parseFloat(allowances.steth) !== 0 ? (
                    <button
                      onClick={() => depositTo()}
                      className="myButton purple-hover"
                    >
                      {/* {depositLoading && "DEPOSITING..."}
                  {depositIdle && "DEPOSIT"}
                  {isDepositError && "DEPOSIT ERROR, TRY AGAIN"}
                  {depositWaitSuccess && "DEPOSIT SUCCESSFUL"} */}
                      DEPOSIT
                    </button>
                  ) : (
                    <button
                      onClick={() => approve()}
                      className="myButton purple-hover"
                    >
                      {/* {approveLoading && "APPROVING..."}
                  {approveIdle && "APPROVE"}
                  {isApproveError && "APPROVE ERROR, TRY AGAIN"}
                  {approveSuccess && "APPROVE SUCCESSFUL"} */}
                      APPROVE
                    </button>
                  )}
                </>
              )}
              <br></br>
            </div>
          )}
          {modalFocus === "winners" && <div><div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>
              
              <span>RECENT DRAW WINNERS</span><br></br><br></br><table className="winner-table">
              
              {prizeMap.map(winner=>{ return(
                <tr><td>{winner.winner.startsWith("0x7cf2eb") ? <span>GC</span> :
                <img src="images/trophy.png" className="winner-icon"></img>}</td>
                
                <td><span className="winner-address">{winner.winner.substring(0,8)}</span></td>
                <td><span className="winner-amount">{numberChop(winner.amount/1e18)}</span></td></tr>)
              })}
              </table>
              
              </div>}
          {modalFocus === "withdrawWallet" && (
            <div>
              <div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>
              {!isConnected && "Please connect wallet"}

              {isConnected && (
                <>
                  {" "}
                  WITHDRAW on
                  <img
                    src={"./images/" + "ethereum" + ".png"}
                    className="emoji"
                    alt={chain.name}
                  />{" "}
                  {chain.name}
                  <br></br>
                  {/* {balances.polygon !== undefined &&  */}
                  <div className="amount-container">
                    <table className="table-inputamount">
                      <tr>
                        <td>
                          <img
                            src="./images/ethereum.png"
                            className="icon"
                            alt="ETHWIN"
                          />{" "}
                          ETHWIN &nbsp;
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="wallet-message">
                            {walletMessage !== "" && walletMessage}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2}>
                          <input
                            type="text"
                            className="amount-input"
                            value={inputAmount}
                            ref={amountInput}
                            onChange={(e) => {
                              setWalletMessage("");
                              setInputAmount(e.target.value);
                            }}
                          ></input>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ textAlign: "right" }}>
                          <span className="small-balance">
                            Balance {ethers.utils.formatUnits(balances[0].ethwin,18)}
                            {balances[0].ethwin.gt(BNZERO) && (
                              <span
                                className="max-balance"
                                onClick={(e) =>
                                  setInputAmount(ethers.utils.formatUnits(balances[0].ethwin,18))
                                }
                              >
                                &nbsp;MAX
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  {withdrawFetching ? (
                    <span>
                      <span>
                        <span className="pending-text">
                          TRANSACTION PENDING
                        </span>
                        &nbsp;&nbsp;
                        <div
                          className="verySmallLoader"
                          style={{ display: "inline-block" }}
                        ></div>
                      </span>
                    </span>
                  ) : withdrawLoading ? (
                    <span>
                      <span className="pending-text">PENDING CONFIRMATION</span>
                      &nbsp;&nbsp; &nbsp;&nbsp;
                      <div
                        className="verySmallLoader"
                        style={{ display: "inline-block" }}
                      ></div>
                    </span>
                  ) : (
                    <button
                      onClick={() => withdrawFrom()}
                      className="myButton purple-hover"
                    >
                      WITHDRAW
                    </button>
                  )}
                </>
              )}
              <br></br>
            </div>
          )}
        </center>
     
      </Modal> <br></br> <center>{chain.id===1 && <span
                      onClick={() => getWinners()}
                      className="bottom-menu"
                    >
                      WINNERS
                    </span>}</center> 
      <ToastContainer />
      <br></br>
      <br></br>
      {poolInfo?.prizepool > 0 && (
        <span className="tvl">
          {" "}
          TVL {numberChop(poolInfo?.prizepool)} stETH
        </span>
      )}
    </div>
  );
}

export default Dapp;
