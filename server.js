// require serverless version
import addon from './index.js';

const PORT = process.env.PORT || 7000

// create local server
addon.listen(PORT, () => {
    console.log(`Addon active on port ${PORT}.`);
    console.log(`http://127.0.0.1:${PORT}/`);
});