export default function Map() {
  return (
    <>
      <div className="flex flex-col justify-between h-screen p-4">
        {/* Top / Content section */}
        <div>Today's Steps: X</div>

        {/* Buttons pinned to the bottom */}
        <div className="flex flex-row justify-center gap-10 mb-10">
          <a className="Map-Buttons" href="/Dex">Dex</a>
          <button className="bg-blue"></button>
          <a className="Map-Buttons" href="/profile">Profile</a>
        </div>
      </div>
    </>
  );
}