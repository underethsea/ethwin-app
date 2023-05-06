import Countdown from "react-countdown";
const Completionist = () => (
  <span
    className="open-wallet"
    onClick={() => {
      openAward();
    }}
  >
    &nbsp;
    {/* <span className=" display-not-block">PRIZES ARE GROWING</span>&nbsp; */}
  </span>
);

async function openAward() {}
// export const Timer = (props) => {
//    return <Countdown date={props.seconds}>
//        {/* <Completionist /> */}
//    </Countdown>
// }

const renderer = ({ days, hours, minutes, seconds, completed }) => {
  if (completed) {
    // Render a completed state
    return (
      <span>
        {/* <br></br> */}
        <Completionist />
      </span>
    );
  
  } else {
    // Render a countdown
    return (
      <div>
        {/* <span className="timer-text">Next WINS</span> */}

        <span>
          {days > 0 && <span className="time-number">{days}d</span>}
          &nbsp;<span className="time-number">{hours}h</span>&nbsp;
          <span className="time-number">{minutes}m</span>&nbsp;
          <span className="time-number">{seconds}s</span>
        </span>
      </div>
    );
  }
};

export const Timer = (props) => {
  return <Countdown date={props.seconds} renderer={renderer} zeroPadTime={2} />;
};
