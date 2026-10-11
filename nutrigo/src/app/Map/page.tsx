export default function Map() {
  return (
    <div className="bg-some-purple relative h-screen overflow-hidden">
      {/* Top steps pill */}
      <div className="absolute top-4 inset-x-0 flex justify-center">
        <div className="Steps-Pill">Todays Steps: XXXX</div>
      </div>

      {/* Leaderboard circle: right edge, just above Profile */}
      <a
        href="/leaderboard"
        className="leaderboard-button absolute right-2 bottom-45"
      />

      {/* Bottom nav: no side padding so the pills can bleed off the edges */}
      <div className="absolute bottom-12 inset-x-0 flex items-center justify-between">
        <a className="Map-Buttons -ml-12" href="/Dex">Dex</a>
        <button className="Center-Circle-Button" />
        <a className="Map-Buttons -mr-12" href="/profile">Profile</a>
      </div>
    </div>
  );
}