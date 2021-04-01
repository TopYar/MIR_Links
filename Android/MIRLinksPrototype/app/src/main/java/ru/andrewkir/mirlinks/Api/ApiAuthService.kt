package ru.andrewkir.mirlinks.Api

import com.google.gson.JsonObject
import io.reactivex.Observable
import retrofit2.http.Body
import retrofit2.http.POST
import ru.andrewkir.mirlinks.DataClasses.LoginResult

interface ApiAuthService {
    @POST("auth")
    fun login(
        @Body body: JsonObject
    ): Observable<LoginResult>
}