"use client"
import React, { useState } from 'react';

export default function SingleSelectGroup() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options: string[] = ['To lose weight', 'To maintain weight', 'to gain weight'];

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  return (
    <div className="flex flex-col justify-center items-center w-full mx-auto gap-4 p-6">
        <h1 className="text-lg font-medium text-gray-700 mb-1 ml-2">What is your goal?</h1>
    <div className="button-group flex flex-col w-full mx-auto gap-4 p-6">
      {options.map((option: string) => (
        <button
          key={option}
          className={`select-button ${selectedOption === option ? 'selected' : ''}`}
          onClick={() => handleSelect(option)}
        >
          {option}
        </button>
      ))}
      <a className="submit-button" href="/Map">Submit</a>
    </div>
    </div>
  );
}
    