import mongoose from "mongoose"



const connect = async ()=>{
await mongoose.connect(process.env.MONGODB_URl).then((conn)=>{
    // console.log(conn)
    console.log(`Mongodb connected successfully: ${conn.connection.host}`)
}).catch(err =>{
    console.log(`unable to connect to mongodb: ${err}`)
})

}

export default connect;