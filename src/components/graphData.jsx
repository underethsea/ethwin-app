import { ADDRESS, URL } from "./address";

let query = `query($prizestrategy: String!, $ethwin: String!,$spethwin: String!,$prizepool: String! ){
    multipleWinnersPrizeStrategies(where:
    {id:$prizestrategy}) {
    id,
    numberOfWinners,
      prizePeriodEndAt
    },
    controlledTokenBalances(first:10,orderBy: balance,orderDirection:desc, where:
      {controlledToken:$spethwin})
    {account{id},balance},
    prizePools(where:
    {id:$prizepool}){
      id,
      maxExitFeeMantissa,
      cumulativePrizeGross,
      cumulativePrizeNet,
      currentPrizeId,
      currentState,
      prizes (first:5){
        awardedControlledTokens(first:6){
          id,winner,amount,token {
            id
          }}
        id,
        totalTicketSupply
      }
    }
  }`;
// query = `query($ethwin:String!){
//   multipleWinnersPrizeStrategies(first:5) {
//     id,
//     numberOfWinners,
//       prizePeriodEndAt
//     },
// }`

export const GetSubgraphData = async (chain) => {
  const variables = {
    prizestrategy: ADDRESS[chain].PRIZESTRATEGY.toLowerCase(),
    ethwin: ADDRESS[chain].ETHWIN.toLowerCase(),
    spethwin: ADDRESS[chain].SPETHWIN.toLowerCase(),
    prizepool: ADDRESS[chain].PRIZEPOOL.toLowerCase(),
  };
  const params = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  };
  try {
    let data = await fetch(URL[chain].GRAPH, params);
    data = data.json();
    return data;
  } catch (error) {
    console.log("could not fetch from subgraph", error);
    return null;
  }
};
