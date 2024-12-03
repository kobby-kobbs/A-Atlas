import {faker} from "@faker-js/faker"
import {MongoClient, ObjectId} from "mongodb"
import dotenv from "dotenv";
dotenv.config({path:"/Users/giangpham/Desktop/A-Atlas/.env"}) //would need to change path for your own computer

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomSubset(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}

async function seedDB(){
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri)

    try{
        await client.connect();
        console.log("Connected correctly to server");
        const db = client.db("a_atlas");

        // Collections
        const artCollection = db.collection("Arts");
        const userCollection = db.collection("Users");
        const tourCollection = db.collection("Tours");
        const savedTourCollection = db.collection("SavedTours");

        // Clear existing data (optional)
        await artCollection.deleteMany({});
        await userCollection.deleteMany({});
        await tourCollection.deleteMany({});
        await savedTourCollection.deleteMany({});
        
        const themesList = [
            "Street Art",
            "Abstract",
            "Realism",
            "Surrealism",
            "Pop Art",
            "Modernism",
            "Minimalism",
            "Expressionism",
            "Graffiti",
            "Cubism",
        ];

        //Seed users
        const users = []
        for (let i = 0; i<3;i++){
            const user = {
                _id: new ObjectId(),
                username: faker.internet.username(),
                email: faker.internet.email(),
                liked_arts: [], 
                created_tours: [],
                profile_created_at: faker.date.past(), 
                city: "New York"
            };
            users.push(user);
        }
        await userCollection.insertMany(users)

        const arts = []

        for (let i = 0; i < 10; i++) {
            const city = faker.helpers.arrayElement(["New York", "Berlin"]); // Randomly assign city

            const art = {
                _id: new ObjectId(),
                image_url: faker.image.url(),
                location: {
                    coordinates: [faker.location.longitude(), faker.location.latitude()],
                    city: city
                },

                artist: faker.person.fullName(),
                name: faker.word.words(3),
                themes: getRandomSubset(themesList, randomIntFromInterval(1, 3)),
                created_at: faker.date.past(),
                interactions: {
                    likes_count: randomIntFromInterval(0, 100),
                    comments: Array.from({ length: randomIntFromInterval(0, 5) }).map(() => ({
                        comment_id: new ObjectId(),
                        user_id: users[randomIntFromInterval(0, users.length - 1)]._id,
                        comment_text: faker.lorem.sentence(),
                        timestamp: faker.date.recent(),
                    })),
                },
            };
            arts.push(art);
        }
        await artCollection.insertMany(arts);

        // Link some liked arts to users
        users.forEach(user => {
            user.liked_arts = arts
                .slice(0, randomIntFromInterval(1, arts.length))
                .map(art => art._id);
        });
        await userCollection.deleteMany({});
        await userCollection.insertMany(users);

        // Seed Tours
        const tours = [];
        const tourCities = ["New York", "Berlin"];
        tourCities.forEach((city, index) => {
            const artworksInCity = arts.filter(art => art.location.city === city); // Only include arts in the tour's city
            const artworks = artworksInCity.slice(0, randomIntFromInterval(3, artworksInCity.length)); // Select subset

            const tour = {
                _id: new ObjectId(),
                user_id: users[index % users.length]._id, // Assign to a user in a round-robin fashion
                tour_name: `${city} Tour`,
                city: city,
                description: `A curated tour of artworks in ${city}.`,
                artworks: artworks.map(art => art._id),
                created_at: faker.date.past(),
                visibility: faker.helpers.arrayElement(["public", "private"]),
            };
            tours.push(tour);
            users[index % users.length].created_tours.push(tour._id); // Link tour to user
        });
        
        await tourCollection.insertMany(tours);
        // Update users with created tours
        await userCollection.deleteMany({});
        await userCollection.insertMany(users);

        // Seed SavedTour
        const savedTour = {
            user_id: users[2]._id,
            tour_id: tours[0]._id,
        };
        await savedTourCollection.insertOne(savedTour);

        console.log("Database seeded with synthetic data! :)");

    } catch(err) {
        console.error("Error seeding database:", err);
    } finally {
        await client.close()
    }
}
seedDB();