import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    fullName:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true,
        minLength:6
    },
    profilePic:{
        type:String,
        default:""
    },
    friends:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    friendRequests:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // WebRTC call availability status
    callStatus: {
        type: String,
        enum: ['available', 'busy', 'away'],
        default: 'available'
    },
    // Current call session info
    currentCall: {
        callId: String,
        callType: {
            type: String,
            enum: ['audio', 'video']
        },
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    }
},{timestamps:true});

const User = mongoose.model("User",userSchema);

export default User;