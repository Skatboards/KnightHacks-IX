export default function Dex(){
    return(
        <main className="bg-off-blue min-h-screen p-4">
            <div className="flex flex-col justify-center items-center mb-6">
                <h1 className="text-2xl font-bold mt-10 mb-4">Collectables</h1>
                <input className="Search-input px-4 py-2 mb-5 rounded-lg border border-gray-300 w-full max-w-xs" type="text" placeholder="Search"/>
            </div>
            
            {/* Forced 3 columns grid for mobile and up */}
            <div className="grid grid-cols-2 gap-3 justify-items-center max-w-5xl mx-5 ">
                {[...Array(6)].map((_, index) => (
                    <div 
                        key={index} 
                        className="bg-white h-55 w-45 rounded-3xl drop-shadow-lg" 
                    />
                ))}
            </div>
        </main>
    );
}