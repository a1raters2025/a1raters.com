import mongoose from "mongoose"



const connect = async ()=>{
await mongoose.connect(process.env.MONGODB_URL).then((conn)=>{
    console.log(`Mongodb connected successfully: ${conn.connection.host}`)
}).catch(err =>{
    console.error(`unable to connect to mongodb: ${err}`)
    process.exit(1);
})
}

export default connect;