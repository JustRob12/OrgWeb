"use client";

import Image from "next/image";
import React from "react";
import { CardBody, CardContainer, CardItem } from "./ui/3d-card";
import { LuQrCode, LuUser } from "react-icons/lu";

export function MemberIDCard() {
  return (
    <CardContainer className="inter-var">
      <CardBody className="bg-white/90 relative group/card dark:hover:shadow-2xl dark:hover:shadow-blue-500/[0.1] dark:bg-black/80 dark:border-white/[0.2] border-blue-100/50 w-[340px] h-[460px] rounded-3xl p-8 border flex flex-col items-center shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
        
        {/* Profile Section - Circular */}
        <CardItem
          translateZ="100"
          className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-400/30 shadow-2xl bg-white flex items-center justify-center mb-6 ring-4 ring-white/50"
        >
          <img
            src="/pictures/day.png"
            className="h-full w-full object-cover"
            alt="Roberto Jr M. Prisoris"
          />
        </CardItem>

        {/* Info Section */}
        <div className="text-center w-full mb-6">
            <CardItem
            translateZ="80"
            className="text-2xl font-black text-blue-900 dark:text-blue-100 w-full tracking-tight"
            >
            Roberto Jr M. Prisoris
            </CardItem>
            <CardItem
            as="p"
            translateZ="60"
            className="text-blue-600/80 text-sm font-semibold uppercase tracking-[0.2em] mt-2 dark:text-blue-300/80 w-full"
            >
            Full Stack Dev
            </CardItem>
        </div>

        {/* Ornamental Divider */}
        <CardItem translateZ="40" className="w-full flex items-center gap-2 mb-6">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-800" />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-800" />
        </CardItem>

        {/* QR Code Section */}
        <CardItem
          translateZ="120"
          className="w-28 h-28 bg-white p-3 rounded-2xl shadow-xl border border-blue-100 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
        >
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Roberto%20Jr%20M.%20Prisoris%2C%20Full%20Stack%20Dev" 
            alt="QR Code" 
            className="w-full h-full"
          />
        </CardItem>
        
        <CardItem
          translateZ="30"
          className="text-[10px] text-blue-400 font-bold mt-4 font-mono uppercase tracking-[0.3em]"
        >
          ORG-WEB // ID-ACCESS
        </CardItem>
      </CardBody>
    </CardContainer>
  );
}
