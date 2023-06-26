// const stEthYield = .05

// number w commas
export const Separator = (numb) => {
  numb = numb.toFixed(0);
  var str = numb.split(".");
  str[0] = str[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return str.join(".");
}

// possible prize still to accrue before award based on tvl, yield, and time remaining
export const EstimatePrize = (tvl, secondsRemaining, apy) => {
  // console.log(secondsRemaining,"sec remain")
  // secondsRemaining = 86400 * 5 + 1000;

  let daysRemaining = parseInt((secondsRemaining+1) / 86400);
  let estimate = tvl * ((apy/100) * (daysRemaining / 365));
  // console.log("estimated prize ", estimate);
  return estimate;
}

export const TimeAgo = (timeStamp) => {
  let now = parseInt(Date.now() / 1000)
  let secondsAgo = now - timeStamp
  let daysAgo = parseFloat(secondsAgo / 86400)
  if(daysAgo < 1) {return "today"}
  else if (daysAgo < 2) {return "1 day ago"}
  else {return parseInt(daysAgo) + " days ago"}
}

// crappy decimal formatting
export const NumberChop = (biginput) => {
  let number = Number(biginput);
  if (number > 100000) {
    return number.toFixed(0);
  } else if (number > 100) {
    return number.toFixed(2);
  } else if (number > 1) {
    return number.toFixed(2);
  } else if (number > 0.01) {
    return number.toFixed(4);
  } else if (number > 0.00001) {
    return number.toFixed(6);
    } else if (number > 0.0000001) {
    return number.toFixed(8);
  } else if (number > 0.00000001) {
    return number.toFixed(9);
  } else if (number > 0.0000000001) {
    return number.toFixed(12);
  } else {
    return biginput;
  }
}

// haha
export const DecimalsForCount = (number) => {
  number = Number(number);
  if (number > 100000) {
    return 2;
  } else if (number > 1000) {
    return 4;
  } else if (number > 1) {
    return 4;
  } else if (number > 0.01) {
    return 6;
  } else if (number > 0.00001) {
    return 8;
  } else if (number > 0.00000001) {
    return 11;
  } else if (number > 0.0000000001) {
    return 12;
  } else {
    return 15;
  }
}

// for accessing constants by chain id
export const ChainObject = (chainId) => {
  try {
    if (chainId) chainId = chainId.id;
    if (chainId === 5) {
      return "GOERLI";
    } else if (chainId === 1) {
      return "ETHEREUM";
    } else {
      // console.log("chain not recognized", chainId);
      return "ETHEREUM";
    }
  } catch (error) {
    console.log("chain set to ethereum on error");
    return "ETHEREUM";
  }
}
