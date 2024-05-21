"use client";

import React, { useCallback, useEffect } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Experience } from "~~/components/Experience";
import { Landing } from "~~/components/Landing";
import { RegisterBiomes } from "~~/components/RegisterBiomes";
import { RegisterExperience } from "~~/components/RegisterExperience";
import { Stage, useGlobalState } from "~~/services/store/store";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const stage = useGlobalState(({ stage }) => stage);
  const setStage = useGlobalState(({ setStage }) => setStage);

  const isBiomesRegistered = useGlobalState(({ isBiomesRegistered }) => isBiomesRegistered);
  // const isExperienceRegistered = useGlobalState(({ isExperienceRegistered }) => isExperienceRegistered);
  const isExperienceRegistered = true;

  useEffect(() => {
    if (connectedAddress) {
      if (isBiomesRegistered) {
        if (isExperienceRegistered) {
          setStage(Stage.EXPERIENCE);
        } else {
          setStage(Stage.REGISTER_EXPERIENCE);
        }
      } else {
        setStage(Stage.REGISTER_BIOMES);
      }
    } else {
      setStage(Stage.CONNECT_WALLET);
    }
  }, [connectedAddress, isBiomesRegistered, isExperienceRegistered]);

  const renderStage = useCallback(() => {
    switch (stage) {
      case Stage.CONNECT_WALLET:
        return <Landing />;
      case Stage.REGISTER_BIOMES:
        return <RegisterBiomes />;
      case Stage.REGISTER_EXPERIENCE:
        return <RegisterExperience />;
      case Stage.EXPERIENCE:
        return <Experience />;
    }
  }, [stage, connectedAddress]);

  return <>{renderStage()}</>;
};

export default Home;
