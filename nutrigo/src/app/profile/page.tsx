'use client';
import Circlebutton from "../../../Components/Circlebutton";


import React, { useState } from 'react';

// Helper to get the Monday of the current week
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
}

export default function profile() {

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toDateString()
  );

  // Get the Monday of the week for the currently active date
  const monday = getMonday(currentDate);

  // Generate an array of 7 days starting from Monday
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });

  // Format month and year for the header (e.g., "October 2026")
  const monthYearString = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  return (
    <body className="bg-some-purple">
      <div className="flex flex-col items-center">
        <div className="Meter-box mt-10 p-2.5">
          {/*place the meter for steps and Calories here*/}
    {/* Step Meter with Text Inside */}
  <div className="Step-meter-div b612-mono-bold text-[27px] text-shadow-md">
    <div className="circle-bar-outer flex items-center justify-center relative">
      <div className="circle-bar-inner flex flex-col items-center justify-center">
        <p className="white-outline leading-tight">1000</p>
        <p className="text-[18px]">Steps</p>
      </div>
    </div>
  </div>
          {/* Calorie Meter */}
  <div className="Cal-meter-div b612-mono-bold text-[27px] text-shadow-md relative flex flex-col items-center justify-center">
    <div className="circle-bar-outer relative flex items-center justify-center relative">
      <div className="circle-bar-inner flex items-center justify-center">
        <div className="absolute flex flex-col items-center">
          <p className="white-outline leading-tight">1000</p>
          <p className="text-[18px]">Calories</p>
        </div>
      </div>
    </div>
  </div>

  <div className="Step-div flex justify-between px-3">
    <p className="b612-mono-bold text-[18px]">Average Steps this week:</p>
     <p className="b612-mono-bold white-outline text-[27px] -mt-3">2131</p>
  </div>
  <div className="Cal-div flex justify-between px-3">
    <p className="b612-mono-bold text-[18px]">Average Calories this week:</p>
    <p className="b612-mono-bold white-outline text-[27px] -mt-3">1790</p>
  </div>
</div>
{/*Calendar */}
        <div className="Calendar-box mt-10 p-3 flex flex-col justify-between">
      {/* Header: Month Year & Buttons */}
      <div className="flex justify-between items-center">
        <h1 className="text-[27px] pl-1 pt-1.5 b612-mono-bold">{monthYearString}</h1>
        <div className="flex">
          <div onClick={handlePrevWeek} className="cursor-pointer">
            <Circlebutton  />
          </div>
          <div className="mx-2 cursor-pointer" onClick={handleNextWeek}>
            <Circlebutton  />
          </div>
        </div>
      </div>

      {/* Days of the Week Row */}
      <div className="flex justify-between items-center px-2">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.toDateString();
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
          const dateNum = day.getDate();

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day.toDateString())}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all px-2 py-1 ${
                isSelected
                  ? 'border-2 border-black rounded-full h-[80px] w-[42px]'
                  : 'h-[80px] w-[42px]'
              }`}
            >
              <span className="text-[16px] font-medium">{dayName}</span>
              <span className="text-[20px] font-semibold mt-1">{dateNum}</span>
            </div>
          );
        })}
      </div>
    </div>

        <div className="mt-10">
          <div className="Food-box flex justify-between ">
            <p className="Food-box-text b612-mono-bold">Breakfast</p>
            <div className="mt-2 mr-2">
              <Circlebutton></Circlebutton>
            </div>
            {/*Add Icons and also calories added*/}
          </div>
          <div className="Food-box flex justify-between">
            <p className="Food-box-text b612-mono-bold">Lunch</p>
            <div className="mt-2 mr-2">
              <Circlebutton></Circlebutton>
            </div>
            {/*Add Icons */}
          </div>
          <div className="Food-box flex justify-between">
            <p className="Food-box-text b612-mono-bold">Dinner</p>
            <div className="mt-2 mr-2">
              <Circlebutton></Circlebutton>
            </div>
            {/*Add Icons */}
          </div>
          <div className="Food-box flex justify-between">
            <p className="Food-box-text b612-mono-bold">Snacks</p>
            <div className="mt-1.5 mr-2">
              <Circlebutton></Circlebutton>
            </div>
            {/*Add Icons */}
          </div>
        </div>
      </div>
    </body>
  );
}
