import {
    BrowserRouter as Router,
    Route,
    Routes,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import About from './pages/About';
import Explore from './pages/Explore';
import Home from './pages/Home';
import Simulation from './pages/Simulation';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/explore" element={<Explore />} />
                        <Route path="/simulation" element={<Simulation />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
