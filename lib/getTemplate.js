const STYLESHEET = `
* {
    box-sizing: border-box;
  }

  body,
  html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }

  html {
    background-size: auto 100%;
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
  }

  body {
    display: flex;
    background: rgba(0, 0, 0, 0.6);
    font-family: "Open Sans", Arial, sans-serif;
    color: white;
  }

  h1 {
    font-size: 4.5vh;
    font-weight: 700;
  }

  h2 {
    font-size: 2.2vh;
    font-weight: normal;
    font-style: italic;
    opacity: 0.8;
  }

  h3 {
    font-size: 2.2vh;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
    text-shadow: 0 0 1vh rgba(0, 0, 0, 0.15);
  }

  p {
    font-size: 1.75vh;
  }

  ul {
    font-size: 1.75vh;
    margin: 0;
    margin-top: 1vh;
    padding-left: 3vh;
  }

  a {
    color: white;
  }

  a.install-link {
    text-decoration: none;
  }

  .input {
    width: 40vh;
    height: 5vh;
    padding: 0.5vh 0.5vh;
    margin: auto;
    border: 0.5vh solid #8a5aab;
    font-size: 2.2vh;
    cursor: pointer;
    display: block;
    box-shadow: 0 0.5vh 1vh rgba(0, 0, 0, 0.2);
    transition: box-shadow 0.1s ease-in-out;
    color: #8a5aab;
  }

  button {
    border: 0;
    outline: 0;
    color: white;
    background: #8a5aab;
    padding: 1.2vh 3.5vh;
    margin: auto;
    text-align: center;
    font-family: "Open Sans", Arial, sans-serif;
    font-size: 2.2vh;
    font-weight: 600;
    cursor: pointer;
    display: block;
    box-shadow: 0 0.5vh 1vh rgba(0, 0, 0, 0.2);
    transition: box-shadow 0.1s ease-in-out;
  }

  button:hover {
    box-shadow: none;
  }

  button:active {
    box-shadow: 0 0 0 0.5vh white inset;
  }

  #addon {
    width: 40vh;
    margin: auto;
  }

  .logo {
    height: 14vh;
    width: 14vh;
    margin: auto;
    margin-bottom: 3vh;
  }

  .logo img {
    width: 100%;
  }

  .name,
  .version {
    display: inline-block;
    vertical-align: top;
  }

  .name {
    line-height: 5vh;
  }

  .version {
    position: absolute;
    line-height: 5vh;
    margin-left: 1vh;
    opacity: 0.8;
  }

  .contact {
    position: absolute;
    left: 0;
    bottom: 4vh;
    width: 100%;
    text-align: center;
  }

  .contact a {
    font-size: 1.4vh;
    font-style: italic;
  }

  .separator {
    margin-bottom: 4vh;
}
`;
const { getLanguages } = require('./getLanguages')

async function landingTemplate(manifest) {
  const languages = await getLanguages()
  const arrayIMDB = ["tt0016847","tt0049223","tt0078748","tt0090520","tt0121766","tt0285531","tt1446714","tt2316204","tt5073642","tt0017136","tt0055151","tt0080684","tt0092076","tt0129167","tt0300556","tt1454468","tt2527338","tt7329656","tt0021884","tt0055608","tt0083866","tt0092106","tt0139809","tt0816692","tt1564585","tt2557478","tt0046534","tt0061722","tt0086190","tt0096754","tt0140703","tt0910970","tt1823672","tt2719848","tt0046672","tt0065702","tt0088846","tt0102803","tt0142183","tt1104001","tt1971325","tt3371366","tt0048215","tt0071565","tt0089489","tt0116629","tt0182789","tt1318514","tt2109248","tt3741700"];
  const random = Math.floor(Math.random() * arrayIMDB.length);

  const background = 'https://images.metahub.space/background/medium/' + arrayIMDB[random] + '/img' || 'https://dl.strem.io/addon-background.jpg';
  const logo = manifest.logo || 'https://dl.strem.io/addon-logo.png';
  const contactHTML = manifest.contactEmail ?
      `<div class="contact">
         <p>Contact ${manifest.name} creator:</p>
         <a href="mailto:${manifest.contactEmail}">${manifest.contactEmail}</a>
      </div>` : '';
  const languagesHTML = languages
      .map(language => language.iso_639_1 === 'en-US' ? `<option value="${language.iso_639_1}" selected>${language.name} (${language.iso_639_1})</option>` : `<option value="${language.iso_639_1}">${language.name} (${language.iso_639_1})</option>`)
      .join('\n');
  const stylizedTypes = manifest.types
      .map(t => t[0].toUpperCase() + t.slice(1) + (t !== 'series' ? 's' : ''));

  return `
   <!DOCTYPE html>
   <html style="background-image: url(${background});">
   <head>
      <meta charset="utf-8">
      <title>${manifest.name} - Stremio Addon</title>
      <style>${STYLESHEET}</style>
      <link rel="shortcut icon" href="${manifest.favicon}" type="image/x-icon">
      <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap" rel="stylesheet">
      <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-multiselect/0.9.15/js/bootstrap-multiselect.min.js"></script>
 
   </head>

	<body>
      <div id="addon">
         <div class="logo">
            <img src="${logo}">
         </div>
         <h1 class="name">${manifest.name}</h1>
         <h2 class="version">${manifest.version || '0.0.0'}</h2>
         <h2 class="description">${manifest.description || ''}</h2>
         <div class="separator"></div>
         <h3 class="gives">This addon has more :</h3>
         <ul>
            ${stylizedTypes.map(t => `<li>${t}</li>`).join('')}
         </ul>
         <div class="separator"></div>
         <h2 class="description">Select your language:</h2>
         <select id="language-select" class="input" name="language" onchange="generateInstallLink()">
            ${languagesHTML}
         </select>
         
         <div class="separator"></div>
         <a id="installLink" class="install-link" href="#">
            <button name="Install">INSTALL</button>
         </a>
         ${contactHTML}
      </div>
      <script type="text/javascript">
      $(document).ready(function() {
        const languageMatch = location.href.match(${/\/([a-z]{2}-[A-Z]{2})\//})
        if (languageMatch) {
          $('#language-select').val(languageMatch[1]);
        }
        generateInstallLink();
      });

      function generateInstallLink() {
        const language = $('#language-select').val()
        if (language && language !== 'en-US') {
          installLink.href = 'stremio://' + window.location.host + '/' + language + '/manifest.json';
        } else {
          installLink.href = 'stremio://' + window.location.host + '/manifest.json';
        }
      }
    </script>
	</body>
	</html>`
}

module.exports = { landingTemplate };