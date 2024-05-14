"use client";

import React, { useCallback, useEffect } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Game } from "~~/components/Game";
import { Landing } from "~~/components/Landing";
import { RegisterBiomes } from "~~/components/RegisterBiomes";
import { RegisterGame } from "~~/components/RegisterGame";
import { SetupBiomesClient } from "~~/components/SetupBiomesClient";
import { Stage, useGlobalState } from "~~/services/store/store";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const stage = useGlobalState(({ stage }) => stage);
  const setStage = useGlobalState(({ setStage }) => setStage);

  const isBiomesRegistered = useGlobalState(({ isBiomesRegistered }) => isBiomesRegistered);
  // const isGameRegistered = useGlobalState(({ isGameRegistered }) => isGameRegistered);
  const isGameRegistered = true;
  // const isBiomesClientSetup = useGlobalState(({ isBiomesClientSetup }) => isBiomesClientSetup);
  const isBiomesClientSetup = true;

  useEffect(() => {
    if (connectedAddress) {
      if (isBiomesRegistered) {
        if (isGameRegistered) {
          if (isBiomesClientSetup) {
            setStage(Stage.GAME);
          } else {
            setStage(Stage.SETUP_BIOMES_CLIENT);
          }
        } else {
          setStage(Stage.REGISTER_PLAYER);
        }
      } else {
        setStage(Stage.REGISTER_BIOMES);
      }
    } else {
      setStage(Stage.CONNECT_WALLET);
    }
  }, [connectedAddress, isBiomesRegistered, isGameRegistered, isBiomesClientSetup]);

  const renderStage = useCallback(() => {
    switch (stage) {
      case Stage.CONNECT_WALLET:
        return <Landing />;
      case Stage.REGISTER_BIOMES:
        return <RegisterBiomes />;
      case Stage.REGISTER_PLAYER:
        return <RegisterGame />;
      case Stage.SETUP_BIOMES_CLIENT:
        return <SetupBiomesClient />;
      case Stage.GAME:
        return <Game />;
    }
  }, [stage, connectedAddress]);

  return <>{renderStage()}</>;
};

export default Home;
