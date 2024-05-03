export const HowToPlayComponent: React.FC = ({}) => {
  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="w-full marquee bg-secondary text-center">
        Sign up and get your avatar in{" "}
        <a href="https://biomes.aw" style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}>
          Biome-1
        </a>{" "}
        before playing this experience!
      </div>
      <div className="p-12 flex flex-col justify-between gap-4">
        <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
          It&apos;s a race! First one to get their avatar to enter the designated area in the sky wins the eth!
        </h2>
        <div style={{ display: "flex", width: "90%", gap: "4rem", alignSelf: "center" }}>
          <img
            alt=""
            src="/importareas/four.png"
            style={{ width: "50%", height: "auto" }}
            className="border rounded-sm"
          />
          <img alt="" src="/racetothetopp.png" style={{ width: "50%", height: "auto" }} className="border rounded-sm" />
        </div>
        <div className="p-12 flex flex-col justify-between gap-4">
          <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
            Gameplay Tips
          </h2>
          <div
            className="px-4 pt-2 pb-4 mt-4 flex gap-12 flex-col p-6 text-xl text-left"
            style={{ backgroundColor: "#160b21", border: "1px solid #0e0715" }}
          >
            <div className="flex justify-between">
              <div>Build stairs for your avatar to climb: </div>

              <img
                alt=""
                src="/htp_climb.png"
                style={{ width: "40%", height: "auto" }}
                className="border rounded-sm text-center"
              />
            </div>
            <div className="flex justify-between">
              <div>Kill anyone in the way: </div>

              <img
                alt=""
                src="/htp_hit.png"
                style={{ width: "80%", height: "auto" }}
                className="border rounded-sm text-center"
              />
            </div>

            <div className="flex justify-between">
              <div>Mine blocks below other avatars to drop and hurt them: </div>

              <img
                alt=""
                src="/htp_gravity.png"
                style={{ width: "60%", height: "auto" }}
                className="border rounded-sm text-center"
              />
            </div>

            <div>Double tap your space key to fly and more easily direct your onchain avatar!</div>
          </div>
        </div>
      </div>
    </div>
  );
};
