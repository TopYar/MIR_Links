package ru.andrewkir.mirlinks.DataClasses

data class LoginResult (
    var authToken: String,
    var accountNumber: String,
    var name: String
)