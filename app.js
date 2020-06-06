const express = require('express');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

const app = express();

const port = process.env.PORT || 3000; //the server started at port 3000
app.listen(port, () => {
    console.log(`Starting server at ${port}`);
});
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));

const users_list = []

//Routes
app.get('/users', (req, res) => {    //for debugging test: check the user account and encrypted account
    res.json(users_list)
})   

app.post('/users/reg', async (req, res) => {     //register part: let user create account 
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = { name: req.body.name, password: hashedPassword }
        users_list.push(user)
        //console.log(user)
        res.send("Account Created \n" + JSON.stringify(user))
    } catch {
        res.status(500).send()
    }
})

app.post('/users/login', async (req, res) => {
    const user = users_list.find(user => user.name === req.body.name)
    if (user == null) {
        return res.status(400).send('Cannot find user')    //If the user account no found or not created will be return status 400
    }
    try {
        if (await bcrypt.compare(req.body.password, user.password)) { // If the user login properly, an only valid for 60s token will be send to users 
            //console.log(new Date());
            //console.log("1 - " + JSON.stringify(user))
            //console.log("2 - " + JSON.stringify(users_list))
            //console.log("User login - ");
            jwt.sign(user, 'secretkey', { expiresIn: '60s' }, (err, token) => {
                console.log("token - " + token)
                res.json({
                    token    //return token and show on the body 
                });
            });
            //res.send('Success')
        } else {
            res.send('Login failed')  
        }
    } catch {
        res.status(500).send()
    }
})

function verifyToken(req, res, next) {  // Verify the token make sure the user are loged in
// By Bearer token
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== undefined) {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);   // if can pass the verification then 
    }

}


app.post('/q=:q', verifyToken, async (request, response) => {
    jwt.verify(request.token, 'secretkey', async (err, authData) => {
        if (err) {
            response.sendStatus(403)
        } else {
            var IMGData = [{   //initializing the data format first
                image_ID: "",
                thumbnails: "",
                preview: "",
                title: "",
                source: "",
                tags: []
            }]

            const search_item = request.params.q
            //console.log(search_item)
            const API_KEY_Pixabay = '16881123-3276b8db86ea7c7b2ae8a572c';
            const url_Pixabay = `https://pixabay.com/api/?key=${API_KEY_Pixabay}&q=${search_item}&image_type=photo&pretty=true`
            //const url_Pixabay = `https://api.npoint.io/722bdd3fa708cd040a63`
            const Pixabay_response = await fetch(url_Pixabay).catch((error) => {
                console.error('Error: ', error);
              });
            const Pixabay_imgdata = await Pixabay_response.json()
            var arrayLength = Pixabay_imgdata.hits.length;
            var i = 0;
            // As the data returned by the API is different, so i use 2 loops to handle them and merge them together later on
            for (i = 0; i < arrayLength; i++) {
                var tags = Pixabay_imgdata.hits[i].tags.split(', ')
                //console.log(tags.length)
                IMGData[i] = {
                    image_ID: Pixabay_imgdata.hits[i].id,
                    thumbnails: Pixabay_imgdata.hits[i].largeImageURL,
                    preview: Pixabay_imgdata.hits[i].previewURL,
                    title: Pixabay_imgdata.hits[i].webformatURL,
                    source: 'Pixabay',
                    tags: tags
                }
            }

            const API_KEY_unsplash = 'LPVao1U3qqdlUXbaU1YyP5TCFLMSINYz5gMuPVs6mBw';
            const url_unsplash = `https://api.unsplash.com/search/photos?page=1&query=${search_item}&client_id=${API_KEY_unsplash}`

            //const url_unsplash = `https://api.npoint.io/2dc1897782c515dc1cc1`; // I copied the api response to another API provider to prevent exceeding the API call limit
            const unsplash_response = await fetch(url_unsplash).catch((error) => {
                console.error('Error: ', error);
              });
            const unsplash_imgdata = await unsplash_response.json()
            var arrayLength = i + unsplash_imgdata.results.length;

            for (i; i < arrayLength; i++) {
                var secArrLength = unsplash_imgdata.results.length;
                for (let j = 0; j < secArrLength; j++) {
                    var tagArrLength = unsplash_imgdata.results[j].tags.length;
                    var tagsArr = [];
                    for (let k = 0; k < tagArrLength; k++) {
                        tagsArr[k] = unsplash_imgdata.results[j].tags[k].title
                        IMGData[i] = {
                            image_ID: unsplash_imgdata.results[j].id,
                            thumbnails: unsplash_imgdata.results[j].urls.thumb,
                            preview: unsplash_imgdata.results[j].urls.regular,
                            title: unsplash_imgdata.results[j].urls.raw,
                            source: 'Unsplash',
                            tags: tagsArr
                        }
                    }

                }
            }
            //console.log(IMGData.length)
            if (IMGData = null) {
                response.send("Please try later")
            } else {
                response.send(IMGData) //return a json object array of image data to the user
            }
            
        }

    });
});

