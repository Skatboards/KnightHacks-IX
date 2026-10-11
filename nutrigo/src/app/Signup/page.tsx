export default function Signup() {
  return (
    <div className="bg-lightish-pink ">
      <div className="flex flex-col justify-center items-center">
      <h1 className="signupheading b612-mono-bold">Sign Up</h1>
      </div>
      <div className="flex flex-col justify-center items-center w-full mx-auto gap-4 p-6">
        <div className="w-full">
          <h2 className="text-lg font-medium text-gray-700 mb-1 ml-2 b612-mono-bold">
            Username
          </h2 >
          <input
            type="text"
            className="w-full px-4 py-3 rounded-full border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="Enter username"
          />
        </div>

        <div className="w-full">
          <h2 className="text-lg font-medium text-gray-700 mb-1 ml-2 b612-mono-bold">
            Password
          </h2>
          <input
            type="password"
            className="w-full px-6 py-3 rounded-full border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="Enter password"
          />
        </div>
      </div>

      <div className="w-full mx-auto p-6 -mt-8">
        <h2 className="text-lg font-medium text-gray-700 mb-1 ml-2 b612-mono-bold">
          Date of Birth
        </h2>
        <div className="flex justify-between gap-6">
          <input
            type="number"
            className=" px-4 py-3  w-[25%] border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="MM"
            min="1" max="12"
          ></input>
          <input
            type="number"
            className=" px-4 py-3  w-[25%] border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="DD"
            min="1" max="31"
          ></input>
          <input
            type="number"
            className=" px-4 py-3  w-[35%] border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="YYYY"
            min="1900" max="2026"
          ></input>
        </div>
      </div>

      <div className="w-full mx-auto p-6 -mt-8">
        <h2 className="text-lg font-medium text-gray-700 mb-1 ml-2 b612-mono-bold">Height</h2>
        <div className="flex justify-between gap-25">
          <input
            type="text"
            className=" px-4 py-3  w-[50%] border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="Feet"
          ></input>
          <input
            className=" px-4 py-3  w-[50%] border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="Inches"
          ></input>
        </div>
      </div>
      
      <div className="flex flex-col justify-center items-center w-full mx-auto gap-4 p-6 -mt-8">
        <div className="w-full"> 
          <h2 className="text-lg font-medium text-gray-700 mb-1 ml-2 b612-mono-bold">
            Weight
          </h2>
          <div>
            <input className=" px-4 py-3  w-full border-2 border-white bg-[#C8BAF1]/30 outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm"
            placeholder="Inches"></input>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center w-full mx-auto gap-4 p-6 -mt-8">
        <label className="text-lg font-medium text-gray-700 -mb-2.5 ml-2 b612-mono-bold" htmlFor="workout frequency">How often do you work out?</label>
        <select className=" px-4 py-3  w-full border-2 border-white  outline-none focus:ring-2 focus:ring-[#C8BAF1] text-gray-800 placeholder-gray-400 shadow-sm" id="workout frequency">
          <option className="bg-[#C8BAF1]/30" value="little or no excercise">
            Little or no excercise
          </option>
          <option className="bg-[#C8BAF1]/30" value="1-3 times a week"> 1-3 times a week </option>
          <option value="4-5 times a week"> 4-5 times a week</option>
          <option value="Daily excercise"> Daily excercise </option>
        </select>
      </div>

      <div className="flex flex-col justify-center items-center mt-5 mb-25">
      <a className="submit-button" href="/Signup/input2">Submit</a>
      </div>
    </div>
  );
}
