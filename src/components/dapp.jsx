import React, { useState, useEffect, useCallback } from "react";

import Modal from "react-modal";
import "../modal.css";
import { Timer } from "./timer";
// import CountUp from "react-countup";

import { GetSubgraphData } from "../functions/graphData";
import { ethers } from "ethers";
import {
  chain,
  useAccount,
  // useConnect,
  // useContract,
  // useContractRead,
  usePrepareContractWrite,
  useContractWrite,
  useNetwork,
  useWaitForTransaction,
  // useSigner,
} from "wagmi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  EstimatePrize,
  ChainObject,
  TimeAgo,
  NumberChop,
} from "../functions/utils";

import { PROVIDERS } from "../constants/providers.jsx";
import { CONTRACT } from "../constants/contractConnect.jsx";
import { ADDRESS } from "../constants/address.jsx";
import { ABI } from "../constants/abi.jsx";

// hardcoded for now | in utils
const STETH_APY = 5; // fallback if not fetched
const BNZERO = ethers.BigNumber.from("0");
const BNZEROHEX = "0x00"
const BNONEWEI = ethers.BigNumber.from("1");
const NUMBER_OF_PRIZES = 2;
const PRIZE_SPLIT_PCT = 0.5;
const cacheRefreshTime = 90000;

const ethValue = (amount) => {
  return ethers.utils.formatUnits(amount, 18);
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function Dapp() {
  // get users balances
  async function getBalance(address) {
    try {
      // console.log(ChainObject(chain), "fetching balances");

      let [stethBalance, ethwinBalance, spEthWinBalance] = await Promise.all([
        CONTRACT[ChainObject(chain)].STETH.balanceOf(address),
        CONTRACT[ChainObject(chain)].ETHWIN.balanceOf(address),
        CONTRACT[ChainObject(chain)].SPETHWIN.balanceOf(address),
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
    // console.log(ChainObject(chain), "getting pool stats");
    let [
      prizePoolBalance,
      spethwinTotalSupply,
      ethwinTotalSupply,
      prizePeriodRemainingSeconds,
    ] = await Promise.all([
      CONTRACT[ChainObject(chain)].STETH.balanceOf(
        ADDRESS[ChainObject(chain)].PRIZEPOOL
      ),
      CONTRACT[ChainObject(chain)].SPETHWIN.totalSupply(),
      CONTRACT[ChainObject(chain)].ETHWIN.totalSupply(),
      CONTRACT[ChainObject(chain)].PRIZESTRATEGY.prizePeriodRemainingSeconds(),
    ]);
    let stethDayApy = STETH_APY;
    let stethMonthApy = STETH_APY;
    let isStethApyFetch = false;
    try {
      let apy = await fetch("https://poolexplorer.xyz/lidoApy");
      apy = await apy.json();
      stethDayApy = apy.day;
      stethMonthApy = apy.month;
      isStethApyFetch = true;
    } catch {
      console.log("lido apy fetch error");
    }

    let poolStats = {
      prizepool: ethValue(prizePoolBalance),
      ethwinTotalSupply: ethValue(ethwinTotalSupply),
      spethwinTotalSupply: ethValue(spethwinTotalSupply),
      remainingSeconds: parseInt(prizePeriodRemainingSeconds),
      stethDayApy: stethDayApy,
      stethMonthApy: stethMonthApy,
      isStethApyFetch: isStethApyFetch,
    };
    // console.log("stats", poolStats);
    return poolStats;
  }

  const {
    // connector: activeConnector,
    address,
    // isConnecting,
    // isDisconnected,
    isConnected,
  } = useAccount({
    onConnect({ address, connector, isReconnected }) {
      console.log("Connected", { address, connector, isReconnected });
    },
  });

  // const { connect, connectors, error, isLoading, pendingConnector } =
  //   useConnect();

  // const signer = useSigner();

  const [checked, setChecked] = useState(false)
  const [cacheTime, setCacheTime] = useState(0);
  const [balances, setBalances] = useState([
    { steth: BNZERO, ethwin: BNZERO, spethwin: BNZERO },
  ]);
  const [poolInfo, setPoolInfo] = useState({});
  const [winnerDrawDisplay, setWinnerDrawDisplay] = useState(0);
  // const [addressValue, setAddressValue] = useState("");
  const [popup, setPopup] = useState(Boolean);
  const [graphInfo, setGraphInfo] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFocus, setModalFocus] = useState("claim");
  const [allowances, setAllowances] = useState({});
  const [withdrawButton, setWithdrawButton] = useState("WITHDRAW");
  const [inputAmount, setInputAmount] = useState("");

  const [updateWallet, setUpdateWallet] = useState(0);
  const [walletMessage, setWalletMessage] = useState(""); // lousy bug-fix for setPoolerToWallet not getting poolerAddress useEffect to trigger
  const [giveAmount, setGiveAmount] = useState(0)
  
  const amountInput = useCallback((inputElement) => {
    if (inputElement) {
      inputElement.focus();
    }
  }, []);
  // const {refresh, setRefresh} = useState(0)

  const { chain } = useNetwork();

  const changeCheckbox = () => {
    setChecked(!checked);
  };

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


  // async function openAward() {
  //   setModalFocus("award");
  //   setIsModalOpen(true);
  // }

  async function openModal() {
    setIsModalOpen(true);
  }

  async function closeModal() {
    setIsModalOpen(false);
    setWalletMessage("");
    setWithdrawButton("WITHDRAW");
  }

  async function getStats() {
    setModalFocus("stats");
    setIsModalOpen(true);
    let data = await callGraph("ETHEREUM");
    // console.log(data)
    // setGraphInfo(data)
  }
async function callGraphNoCache(network) {
  try{
  let graphReturn = await GetSubgraphData(network);
  let processedPlayers = await processPlayers(graphReturn)

  let processedWinners = processWinners(graphReturn)
  let poolGraphInfo = {
    playerMap: processedPlayers,
    prizeMap: processedWinners,
    prizeGross: graphReturn.data.prizePools[0].cumulativePrizeGross
  }
  setGiveAmount(processedWinners.totalGive)
  setGraphInfo(poolGraphInfo);
  setCacheTime(Date.now());
}catch(error){console.log("graph fetch error",error)}
}
  async function callGraph(network) {
    if (Date.now() - cacheTime < cacheRefreshTime && graphInfo !== {}) {
      // console.log("using cache graph data", Date.now() - cacheTime);
      return graphInfo;
    } else {
     await callGraphNoCache(network)
    }
  }
  function processWinners(graph) {
    let winnerMap = graph.data.prizePools[0].prizes.reverse();
    let draws = winnerMap.length;
    // remove first two test draws
    draws = draws - 2;
    let winHistory = [];
    
    winnerMap.forEach((mappedDraw) => {
      if(mappedDraw.awardedTimestamp !== null)  {

      winHistory.push({
        timestamp: mappedDraw.awardedTimestamp,
        drawId: draws,
        winnerMap: mappedDraw.awardedControlledTokens,
      });}
      draws -= 1;
    });
    console.log(winHistory)
    winHistory.totalGive = 0
    winHistory.forEach(drawNumber => {
        let charity = drawNumber.winnerMap.filter(player=>player.winner === "0x7cf2ebb5ca55a8bd671a020f8bdbaf07f60f26c1")
        let charityamt = charity[0]?.amount 
        winHistory.totalGive += parseInt(charityamt) / 1e18
    })
    console.log("DONATED",winHistory.totalGive)

    // remove first two test draws
    winHistory.splice(winHistory.length - 2, winHistory.length - 1);
    return winHistory;

  }
async function processPlayers(graph) {
try{
  console.log(graph.data)
   let playerMapData = graph.data.prizePools[0].controlledTokens[0].balances.concat(graph.data.prizePools[0].controlledTokens[1].balances)
  playerMapData = playerMapData.sort(((a, b) => a.balance - b.balance)).reverse()
   console.log(playerMapData)
   console.log(playerMapData)
   let playerIndex = 0;
   let playersArray = [];

   for (const player of playerMapData) {
     // let ens = await PROVIDERS[ChainObject(chain)].lookupAddress(player.account.id)
     // if(ens !== null) {console.log(ens);playerMapData[playerIndex].account.id = ens}
     playersArray.push(player.account.id);
     playerIndex += 1;
   }
   let ensResults = await CONTRACT[ChainObject(chain)].ENS.getNames(
     playersArray
   );
   playerIndex = 0;
   for (const player of playerMapData) {
     if (ensResults[playerIndex] !== "") {
       playerMapData[playerIndex].account.id = ensResults[playerIndex];
     }
     playerIndex += 1;
   }
   return playerMapData}
 catch(error){console.log(error)}
}
  async function getPlayers() {
    let graphReturn = await callGraph("ETHEREUM")
    // setPlayerMap(playerMapData);
    setModalFocus("players");
    setIsModalOpen(true);
  }

  async function getWinners() {
    console.log("getting winners");
    let data = await callGraph("ETHEREUM");

    setWinnerDrawDisplay(0);
    setModalFocus("winners");
    setIsModalOpen(true);
  }

  // async function getSponsors() {
  //   // console.log("getting sponsors");
  //   let data = await callGraph("ETHEREUM");
  //   // setGraphInfo(data);
  //   console.log("got graph info", data);
  //   let sponsorMap = data.data.controlledTokenBalances
  //   console.log(sponsorMap)
  //   setSponsorMap(sponsorMap);
  //   setModalFocus("sponsors");
  //   setIsModalOpen(true);
  // }

  function changeWinnerDraw(change) {
    setWinnerDrawDisplay(winnerDrawDisplay + change);
  }
  async function calculateExitFee(exitFeeAddress, exitFeeDeposit) {
    console.log(
      "exit feee calc fetch",
      exitFeeAddress,
      ADDRESS[ChainObject(chain)].ETHWIN,
      exitFeeDeposit
    );
    let exitFee = await CONTRACT[
      ChainObject(chain)
    ].PRIZEPOOL.callStatic.calculateEarlyExitFee(
      exitFeeAddress,
      ADDRESS[ChainObject(chain)].ETHWIN,
      exitFeeDeposit
    );
    // console.log("exitfee", exitFee[1].toString()) // index 0 is burned credit - 1 is exit fee
    // exitFee = parseInt(exitFee[1]) * 1.05
    // return exitFee.toString();
    // console.log("fee", exitFee.exitFee.toString());
    return exitFee.exitFee.toString();
  }

  // render log party

  // console.log("rendered")
  // console.log(graphInfo?.data?.controlledTokenBalances)
  // console.log(prizeDistributor)
  // console.log(balances);
  // console.log("ethwinbalance", balances[0].ethwin);
  // console.log("chain", chain);
  // console.log("isconnected", isConnected);
  // console.log(address)
  // console.log(allowances);
  // console.log(chain)

  // const isInvalidInputAmt = (amt) => {
  //   const inputAmt = Number(amt);
  //   return Number.isNaN(inputAmt) || inputAmt <= 0;
  // };

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
    if (isNaN(amt)) {
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

  // calculateExitFee(address, amountFormatForSend(inputAmount))

  // ------ WITHDRAW TRANSACTION CONFIG -------- //

  const { config: withdrawConfig } = usePrepareContractWrite({
    args: [
      address,
      amountFormatForSend(inputAmount),
      ADDRESS[ChainObject(chain)].ETHWIN,
      amountFormatForSend(inputAmount),
    ],
    addressOrName: ADDRESS[ChainObject(chain)].PRIZEPOOL,
    contractInterface: ABI.PRIZEPOOL,
    functionName: "withdrawInstantlyFrom",
    overrides: {
      gasLimit: 425000,
    },
  });


  // ------ DEPOSIT TRANSACTION CONFIG -------- //
  const { config: depositConfig } = usePrepareContractWrite({
    args: [
      address,
      amountFormatForSend(inputAmount),
      checked ? ADDRESS[ChainObject(chain)].SPETHWIN : ADDRESS[ChainObject(chain)].ETHWIN,
      "0x0000000000000000000000000000000000000000",
    ],
    addressOrName: ADDRESS[ChainObject(chain)].PRIZEPOOL,
    contractInterface: ABI.PRIZEPOOL,
    functionName: "depositTo",
    overrides: {
      gasLimit: 425000,
    },
  });

  // ------ APPROVE TRANSACTION CONFIG -------- //
  const { config: stethConfig } = usePrepareContractWrite({
    args: [
      ADDRESS[ChainObject(chain)].PRIZEPOOL,
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    ],
    addressOrName: ADDRESS[ChainObject(chain)].STETH,
    contractInterface: ABI.ERC20,
    functionName: "approve",

    overrides: {
      gasLimit: 95000,
    },
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

  const {
    isFetching: approveFetching,
    isLoading: approveWaitLoading,
    isSuccess: approveWaitSuccess,
  } = useWaitForTransaction({
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
      let conditionOne = isConnected &&
      balances[0].steth === BNZERO &&
      balances[0].ethwin === BNZERO
      let conditionTwo = balances[0].steth.toString() == 0 && balances[0].ethwin.toString() == 0
      if (
       conditionOne || conditionTwo
      ) {
        return (
          <div className="call-to-stake">
            <span className="get-token">
              WANNA WIN? GET stETH{" "}
              <a href="https://app.uniswap.org">
                <span title="Uniswap">
                  <img
                    src="images/uniswap.webp"
                    className="token-icon"
                    alt="uniswap"
                  />
                </span>
              </a>
              <span title="Lido">
                <a href="https://stake.lido.fi/">
                  <img
                    src="images/lido.png"
                    className="lido-icon"
                    alt="lido"
                  ></img>
                </a>
                
              </span>
            </span>
          </div>
        );
      } else {
        return null;
      }
    }
  }

  function DepositButton() {
    // if (balances[0] !== undefined) {
      // console.log(balances);
      return (
        isConnected && (
          <span>
            {/* {balances[0].steth.gt(BNONEWEI) && ( */}
              <span>
                <span
                  className="pointer"
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
            {/* )} */}
          </span>
        )
      );
    // } else {
    //   return null;
    // }
  }

  function WithdrawButton() {
    if (balances[0] !== undefined) {
      return (
        isConnected && (
          <span>
            {balances[0].ethwin.gt(BNZERO) && (
              <span
                className="pointer"
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

  //         <span className="pointer" onClick={() => { openAward(); }}>&nbsp;
  //           <span className="actionButton display-not-block">AWARD PRIZE</span>&nbsp;

  //     </span>
  //     )
  //   } else { return null }
  // }

  const approve = () => {
    if (chain.id === 1 || chain.id === 5) {
      try {
        approveWrite();
        toast("Approving!", {
          position: toast.POSITION.BOTTOM_RIGHT,
        });
      } catch (error) {
        setWalletMessage("error, see console");
        console.log(error);
      }
    } else {
      setWalletMessage("wrong chain");
    }
  };

  const depositTo = async () => {
    if (chain.id === 1 || chain.id === 5) {
      // console.log("input amt ",inputAmount)
      // console.log("deposit amounts balance",balances[0].steth," ",balances[0].steth.toString()," ",ethers.utils.parseUnits(inputAmount,18))
      try {
        if (
          balances[0].steth.lt(
            ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount, 18))
          )
        ) {
          setWalletMessage("insufficient balance");
        }
        // else if (parseFloat(inputAmount) < 2) { setWalletMessage("2 usdc minimum") }
        else if (
          ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount, 18)).lt(
            BNONEWEI
          )
        ) {
          setWalletMessage("amount invalid");
        } else {
          const rngStatus = await CONTRACT[
            ChainObject(chain)
          ].PRIZESTRATEGY.isRngRequested();
          if (!rngStatus) {
            setUpdateWallet(updateWallet + 1);
            try {
              depositWrite();
              // toast("Depositing!", {
              //   position: toast.POSITION.BOTTOM_RIGHT,
              // });
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
    } else {
      setWalletMessage("wrong chain");
    }
  };

  const withdrawFrom = async () => {
    if (chain.id === 1 || chain.id === 5) {
      let okToWithdraw = false;
      if (withdrawButton === "OK WITHDRAW WITH FEE") {
        okToWithdraw = true;
      }
      try {
        console.log("withdraw balance", balances[0].ethwin);
        console.log("input amt", inputAmount);
        // if (balances[0].ethwin === undefined) {
        // } else {
        // }
        if (
          balances[0].ethwin.lt(
            ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount, 18))
          )
        ) {
          setWalletMessage("insufficient balance");
        } else if (
          ethers.BigNumber.from(ethers.utils.parseUnits(inputAmount, 18)).lt(
            BNONEWEI
          )
        ) {
          setWalletMessage("amount invalid");
        } else {
          const rngStatus = await CONTRACT[
            ChainObject(chain)
          ].PRIZESTRATEGY.isRngRequested();
          if (!rngStatus) {
            let exitFee = await calculateExitFee(
              address,
              amountFormatForSend(inputAmount)
            );
            exitFee = exitFee / 1e18;
            if (exitFee > 0 && okToWithdraw === false) {
              setWalletMessage("FEE " + NumberChop(exitFee) + " POOL");
              setWithdrawButton("OK WITHDRAW WITH FEE");
            } else {
              withdrawWrite();
              setWithdrawButton("WITHDRAW");
            }
          } else {
            setWalletMessage("prize is being awarded");
            console.log("prize is being awarded");
          }
        }
      } catch (error) {
        setWalletMessage("error, see console");
        console.log(error);
      }
    } else {
      setWalletMessage("wrong chain");
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
  const start = async () => {await callGraph("ETHEREUM")}
  start();}
  ,[])

  useEffect(() => {
    const getApprovals = async () => {
      if (modalFocus === "wallet" && address) {
        // console.log("fetching approvals");
        let [stethApproval] = await Promise.all([
          CONTRACT[ChainObject(chain)].STETH.allowance(
            address,
            ADDRESS[ChainObject(chain)].PRIZEPOOL
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
      // let data = await callGraph("ETHEREUM");
      // setGraphInfo(data);
    };
    loadPage();
  }, [chain]);

  useEffect(() => {
    const goGetPlayer = async () => {
     
        setPopup(true);
        // const currentTimestamp = parseInt(Date.now() / 1000);
        // console.log("getting player ", address);
        let poolerBalances = await getBalance(address);

        setBalances(poolerBalances);
        setPopup(false);
        if(chain?.id === 1) {
        let graphGo = await callGraphNoCache("ETHEREUM")
        }
    };
    if (isConnected) {
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
            <center>
              <div className="padding-top">
                {/* <div className="table-wrapper has-mobile-cards tablemax"> */}
                <table className="middle-table top-table">
                  <tr>
                    <td>
                      <center>
                        <div className="padding-top">
                          {/* <img src="images/trophyeth.png" className="trophy"></img>&nbsp; */}
                          <span className="top-title">
                           
                            <div className="top-title-text">WEEKLY WINNING</div>
                            <center>
                              <div className="top-info">
                                <div>
                                  <img
                                    src="/images/ethbrand.png"
                                    className="eth-title"
                                    alt="ethpower"
                                  ></img>
                                </div>
                                <div>
                                  <div>
                                    &nbsp;
                                    {/* projected prize is tvl - tickets + estimatedprize
                              estimated prize is day yield * time left on draw */}
                                    {!isNaN(poolInfo.prizepool) ? (
                                      NumberChop(
                                        poolInfo.prizepool -
                                          poolInfo.ethwinTotalSupply -
                                          poolInfo.spethwinTotalSupply +
                                          EstimatePrize(
                                            poolInfo.prizepool,
                                            poolInfo.remainingSeconds,
                                            poolInfo.stethDayApy
                                          )
                                      )
                                    ) : (
                                      <span className="blank-prize color-opaque">
                                        0.0000
                                      </span>
                                    )}
                                    &nbsp;&nbsp;
                                  </div>
                                  <div className="prize-token-text">stETH</div>
                                </div>
                              </div>
                            </center>

                            {/* COUNTUP ANIMATE PRIZE VALUE */}
                            {/* Prize value */}
                            {/* <img
                              src="/images/trophy.png"
                              className="trophy"
                            ></img> */}

                            {/* {!isNaN(poolInfo.prizepool) && <CountUp start={0}
                            end={NumberChop(
                              poolInfo.prizepool -
                                poolInfo.ethwinTotalSupply -
                                poolInfo.spethwinTotalSupply +
                                EstimatePrize(
                                  poolInfo.prizepool,
                                  poolInfo.remainingSeconds
                                )
                            )}
                            delay = {3}
                            decimal="."
                            decimals={DecimalsForCount(poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + EstimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds))} 
                            >{({ countUpRef, start }) => (
                              <span>
                                <span ref={countUpRef} />
                                </span>
                            )}
                          </CountUp>} */}
                            {/* <CountUp
                                        start={poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + EstimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds)}
                                        end={0.00012057} duration={86400} Separator=" "
                                        decimals={DecimalsForCount(poolInfo.prizepool - poolInfo.ethwinTotalSupply - poolInfo.spethwinTotalSupply + EstimatePrize(poolInfo.prizepool,poolInfo.remainingSeconds))} 
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
                          </span>
                        </div>

                        <div className="padding-bottom">
                          {/* <span class="timer-text">WEEKLY WINNING</span>  */}
                          {
                            !isNaN(poolInfo?.remainingSeconds) && (
                              <Timer
                                seconds={
                                  Date.now() + poolInfo?.remainingSeconds * 1000
                                }
                              />
                            )

                            // <Timer seconds={Date.now() + poolInfo?.remainingSeconds * 1000} />
                          }
                        </div>
                      </center>
                    </td>
                  </tr>
                </table>
                <br></br>
                {!isModalOpen && (
                  <>
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
                                    </span><br></br>
                                    {giveAmount > 0 && <><img
                            title="Charity address"
                            src="images/charityIcon.png"
                            alt=""
                            className="winner-icon"
                          />&nbsp;<span className="give-text">{NumberChop(giveAmount)}</span> <span className="text-two">stETH donated</span></>}
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

                    <br></br>

                    {isConnected && (
                      <>
                        <table className="padded bottom-table">
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

                                {isConnected && balances[0].steth.gt(BNONEWEI) && (
                                  <tr>
                                    <td>
                                      <span className="token-text">STETH</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      {" "}
                                      <img
                                        src="/images/steth.png"
                                        className="token"
                                        alt="steth"
                                      ></img>
                                      &nbsp;
                                      <span className="token-text">
                                        {NumberChop(
                                          ethers.utils.formatUnits(
                                            balances[0].steth,
                                            18
                                          )
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                )}

                                {isConnected && balances[0].ethwin.gt(BNZERO) && (
                                  <tr>
                                    <td>
                                      <span className="token-text">ETHWIN</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <img
                                        src="/images/trophy.png"
                                        className="trophy-token"
                                        alt="trophy"
                                      ></img>
                                      &nbsp;
                                      <span className="token-text">
                                        {NumberChop(
                                          ethers.utils.formatUnits(
                                            balances[0].ethwin,
                                            18
                                          )
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                )}

                                {isConnected &&
                                  balances[0].spethwin.gt(BNZERO) && (
                                    <tr>
                                      <td>
                                        <span className="token-text">
                                          SPETHWIN
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        <img
                                          src="/images/trophy.png"
                                          className="trophy-token"
                                          alt="trophy"
                                        ></img>
                                        &nbsp;
                                        <span className="token-text">
                                          {NumberChop(
                                            ethers.utils.formatUnits(
                                              balances[0].spethwin,
                                              18
                                            )
                                          )}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                              </table>
                              <div className="wallet-buttons padding-bottom padding-top">
                               
                                <DepositButton />
                                <WithdrawButton />
                                <GetStethNow />
                              </div>
                            </center>
                          </th>
                        </table>
                      </>
                    )}
                  </>
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
            top: "8%",
            borderRadius: 10,
            width: 400,
            height: 314,
            background:
              "linear-gradient(141deg, rgb(21 35 56) 28%, rgb(145 93 213) 164%), rgba(41, 11, 90, 0.05)",
            // backgroundColor: "#898d92",
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
                              Balance{" "}
                              {NumberChop(
                                ethers.utils.formatUnits(balances[0].steth, 18)
                              )}
                              {balances[0].steth.gt(BNZERO) && (
                                <span
                                  className="max-balance"
                                  onClick={(e) =>
                                    setInputAmount(
                                      ethers.utils.formatUnits(
                                        balances[0].steth,
                                        18
                                      )
                                    )
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
                  ) : parseFloat(allowances.steth) / 1e6 >=
                      parseFloat(Number(inputAmount)) &&
                    parseFloat(allowances.steth) !== 0 ? (<span>
                    <button
                      onClick={() => depositTo()}
                      className="transaction-button purple-hover"
                    >
                      {/* {depositLoading && "DEPOSITING..."}
                  {depositIdle && "DEPOSIT"}
                  {isDepositError && "DEPOSIT ERROR, TRY AGAIN"}
                  {depositWaitSuccess && "DEPOSIT SUCCESSFUL"} */}
                                          {checked ? "DEPOSIT AS SPONSOR" : "DEPOSIT"}  

                    </button><br></br>
                    <span className="sponsor-span">{!checked &&<label className="containeryo">
                    <input
          type="checkbox"
          checked={checked}
          onChange={changeCheckbox}
        /></label>}{checked && <span><img src="./images/purpleheart.png" className="purple-heart" onClick={changeCheckbox}/></span>}
        <span className="sponsor-text">  SPONSOR {checked && "NOT ELIGIBLE TO WIN"}</span></span>
        </span>   
       
        
              
                  ) : (
                    <button
                      onClick={() => approve()}
                      className="transaction-button purple-hover"
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
          {modalFocus === "players" && (
            <div>
              <div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>

              <span className="title-modal">PLAYERS & SPONSORS <img
                            title="Charity address"
                            src="images/charityIcon.png"
                            alt=""
                            className="winner-icon"
                          /></span>
              <br></br>
              <br></br>
              <table className="winner-table">
                {graphInfo.playerMap.map((player) => {
                  return (
                    <tr>
                      {/* <td>{winner.winner.startsWith("0x7cf2eb") ? <span>GC</span> :
                <img src="images/trophy.png" className="winner-icon"></img>}</td> */}

                      <td>
                        <span className="winner-address">
                          {player.account.id.substring(0, 9)}
                        </span>
                        {player.account.id.toLowerCase() ===
                          address?.toLowerCase() && (
                          <span>
                            &nbsp;
                            <img
                              src="/images/poolerson.png"
                              className="myaddress"
                              alt="U"
                            />{" "}
                          </span>
                        )}
                        {player.controlledToken.id === "0xd5f60154bef3564ebfbe9bb236595f0da548a742" &&<span>
                         {" "}<img
                            title="Charity address"
                            src="images/charityIcon.png"
                            alt=""
                            className="winner-icon"
                          /></span>
                        }
                      </td>
                      <td style={{ textAlign: "right" }}>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <img
                          src="images/steth.png"
                          className="token"
                          alt="steth"
                        ></img>
                        <span className="winner-amount">
                          {NumberChop(player.balance / 1e18)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </table>
              <br></br>
            </div>
          )}
          {modalFocus === "winners" && (
            <div>
              <div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>
              <span className="title-modal">
                DRAW #{graphInfo.prizeMap[winnerDrawDisplay].drawId} WINNERS
              </span>
              <br />
              <br />
              <table className="winner-table">
                {graphInfo.prizeMap[winnerDrawDisplay].winnerMap.map((winner) => {
                  return (
                    <tr>
                      <td>
                        {winner.winner.startsWith("0x7cf2eb") ? (
                          <img
                            title="Charity address"
                            src="images/charityIcon.png"
                            alt=""
                            className="winner-icon"
                          />
                        ) : (
                          <img
                            src="images/trophy.png"
                            className="winner-icon"
                            alt=""
                          ></img>
                        )}
                      </td>

                      <td>
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={"https://etherscan.io/address/" + winner.winner}
                          className="winner-address"
                        >
                          {winner.winner.substring(0, 8)}
                        </a>
                        {winner.winner.toLowerCase() ===
                          address?.toLowerCase() && (
                          <span>
                            &nbsp;
                            <img
                              src="/images/poolerson.png"
                              className="myaddress"
                              alt="U"
                            />{" "}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <span className="winner-amount">
                          <img
                            src="images/steth.png"
                            alt=""
                            className="token-icon-winners"
                          />
                          {NumberChop(winner.amount / 1e18)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </table>
              <span className="footer-modal">
                {winnerDrawDisplay > 0 ? (
                  <img
                    src="images/arrow-left.svg"
                    className="pointer"
                    alt="prev"
                    onClick={() => changeWinnerDraw(-1)}
                  />
                ) : (
                  <span>&emsp;</span>
                )}
                &nbsp;&nbsp;&nbsp;&nbsp; Awarded{" "}
                {TimeAgo(graphInfo.prizeMap[winnerDrawDisplay].timestamp)}
              </span>
              &nbsp;&nbsp;&nbsp;&nbsp;
              {winnerDrawDisplay < graphInfo.prizeMap.length - 1 ? (
                <img
                  src="images/arrow-right.svg"
                  className="pointer"
                  alt="next"
                  onClick={() => changeWinnerDraw(1)}
                />
              ) : (
                <span>&emsp;</span>
              )}
            </div>
          )}
          {/* {modalFocus === "sponsors" && <div><div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>
              
              <span className="title-modal">SPONSORS</span><br/>
              <br/><table className="winner-table">
              
              {sponsorMap.map(sponsor=>{ return(
                <tr>
                                                        {/* <td>{winner.winner.startsWith("0x7cf2eb") ? <span>GC</span> :
                                                      <img src="images/trophy.png" className="winner-icon"></img>}</td> */}
          {/*
                <td><a target="_blank" href={"https://etherscan.io/address/" + sponsor.account.id} className="winner-address">{sponsor.account.id.substring(0,8)}</a></td>
                <td style={{ textAlign: "right" }}>&nbsp;&nbsp;<span className="winner-amount"><img src="images/steth.png" className="token-icon-winners"/>{NumberChop(sponsor.balance/1e18)}</span></td></tr>)
              })}
              </table><br></br>
              <a href="https://docs.steth.win/sponsorship" target="_blank">Read more on sponsoring </a>
              
            </div>}*/}

          {modalFocus === "stats" && (
            <div>
              <div
                className="closeModal close"
                onClick={() => closeModal()}
              ></div>

              <span className="title-modal">STATS</span>
              <br></br>
              <br></br>
              <table className="winner-table">
                <tr>
                  <td>
                    <span className="winner-amount">TVL</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <img src="images/steth.png" className="token" alt=""></img>
                    <span className="winner-amount">
                      {NumberChop(poolInfo?.prizepool)}
                    </span>
                  </td>
                </tr>
                {/* <tr><td>Prize APR</td>
                  <td style={{ textAlign: "right" }}>{(100*(52.14*((poolInfo.prizepool -
                                      poolInfo.ethwinTotalSupply -
                                      poolInfo.spethwinTotalSupply)) / poolInfo.ethwinTotalSupply)).toFixed(2)}%</td></tr> */}
                {graphInfo?.prizeGross > 0 && (
                  <tr>
                    <td>
                      <span className="winner-amount">
                        Cumulative Prize&nbsp;&nbsp;&nbsp;
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <img
                        src="images/steth.png"
                        className="token"
                        alt="steth"
                      ></img>
                      <span className="winner-amount">
                        {NumberChop(graphInfo.prizeGross / 1e18)}
                      </span>
                    </td>
                  </tr>
                )}
                {poolInfo?.isStethApyFetch && (
                  <tr>
                    <td>
                      <span className="winner-amount">stETH 30d APY</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="winner-amount">
                        {poolInfo.stethMonthApy}%
                      </span>
                    </td>
                  </tr>
                )}
              </table>

              {balances[0]?.ethwin.gt(BNZERO) && (
                <div className="footer-modal footer-margin">
                  Your Weekly Odds 1 in&nbsp;
                  {NumberChop(
                    1 /
                      (1 -
                        Math.pow(
                          (poolInfo?.ethwinTotalSupply * PRIZE_SPLIT_PCT -
                            parseFloat(balances[0]?.ethwin) / 1e18) /
                            (PRIZE_SPLIT_PCT * poolInfo?.ethwinTotalSupply),
                          NUMBER_OF_PRIZES
                        ))
                  )}
                </div>
              )}
            </div>
          )}
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
                    src={"./images/ethereum.png"}
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
                            Balance{" "}
                            {ethers.utils.formatUnits(balances[0].ethwin, 18)}
                            {balances[0].ethwin.gt(BNZERO) && (
                              <span
                                className="max-balance"
                                onClick={(e) =>
                                  setInputAmount(
                                    ethers.utils.formatUnits(
                                      balances[0].ethwin,
                                      18
                                    )
                                  )
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
                      className="transaction-button purple-hover"
                    >
                      {withdrawButton}
                    </button>
                  )}
                </>
              )}
              <br></br>
            </div>
          )}
        </center>
      </Modal>{" "}
      <br></br> <center></center>
      <ToastContainer />
      <br></br>
      <br></br>
      {poolInfo?.prizepool > 0 && (
        <span className="tvl">
          {" "}
          {/* TVL {NumberChop(poolInfo?.prizepool)} stETH &nbsp;&nbsp; */}
          &nbsp;
          {chain?.id !== 5 && (
            <span>
              <span onClick={() => getWinners()} className="bottom-menu">
                WINNERS
              </span><span className="hidden-mobile">
              &nbsp;&nbsp;
              <span onClick={() => getPlayers()} className="bottom-menu">
                PLAYERS
              </span></span>
              &nbsp;&nbsp;
              <span onClick={() => getStats()} className="bottom-menu">
                STATS
              </span>
              {/* <span
                      onClick={() => getSponsors()}
                      className="bottom-menu"
                    >
                      SPONSORS
                    </span> */}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default Dapp;
