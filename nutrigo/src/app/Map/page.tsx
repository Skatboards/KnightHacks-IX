export default function Map() {
  return (
    <body className="bg-some-purple">
      <div className="flex flex-col justify-between h-screen p-4 items-center">
        {/* Top / Content section: "Today's Steps" styled like a pill */}
        <div className="Steps-Pill mt-2">
          Todays Steps: XXXX
        </div>

        {/* Buttons pinned to the bottom */}
        <div className="flex flex-row items-center justify-between w-full max-w-md mb-6 px-4">
          <a className="Map-Buttons" href="/Dex">Dex</a>
          
          {/* Middle circular button */}
          <button className="Center-Circle-Button"></button>
          
          <a className="Map-Buttons " href="/profile">Profile</a>
        </div>
      </div>
    </body> 
  );
}