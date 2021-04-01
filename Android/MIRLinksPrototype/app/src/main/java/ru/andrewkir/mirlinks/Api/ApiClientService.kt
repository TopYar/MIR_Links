package ru.andrewkir.mirlinksgreen.api

import com.google.gson.JsonObject
import io.reactivex.Observable
import retrofit2.http.*
import ru.andrewkir.mirlinks.DataClasses.*

interface ApiClientService {
    @GET("links")
    fun getAllLinks(
        @Header("AuthToken") authHeader: String,
        @Header("accountNumber") accountHeader: String
    ): Observable<LinksInfoObject>

    @GET("links/{linkId}")
    fun getLinkInfo(
        @Header("AuthToken") authHeader: String,
        @Path(
            value = "linkId",
            encoded = true
        ) linkId: String
    ): Observable<InfoRoot<LinkDetailInfo>>

    @GET("links/transactions/{linkId}")
    fun getLinkTransactions(
        @Header("AuthToken") authHeader: String,
        @Path(
            value = "linkId",
            encoded = true
        ) linkId: String
    ): Observable<TransactionsInfoObject>

    @DELETE("links/{linkId}")
    fun deleteLink(
        @Header("AuthToken") authHeader: String,
        @Header("x-Idempotency-Key") idempotencyKey: String,
        @Path(
            value = "linkId",
            encoded = true
        ) linkId: String
    ): Observable<JsonObject>

    @GET("balance")
    fun getBalance(
        @Header("AuthToken") authHeader: String,
        @Header("accountNumber") accountHeader: String
    ): Observable<JsonObject>

    @POST("links")
    fun createNewLink(
        @Header("AuthToken") authHeader: String,
        @Header("accountNumber") accountHeader: String,
        @Header("x-Idempotency-Key") idempotencyKey: String,
        @Body body: JsonObject
    ): Observable<JsonObject>

    @GET("send")
    fun sendMoney(
        @Header("AuthToken") authHeader: String,
        @Header("LinkId") linkId: String,
        @Header("accountNumber") accountNumberHeader: String,
        @Header("receiveAccountNumber") receiveAccountNumber: String,
        @Header("sum") sum: Double,
        @Header("x-Idempotency-Key") idempotencyKey: String
    ): Observable<JsonObject>
}

data class User(
    val login: String,
    val id: Long,
    val url: String,
    val html_url: String,
    val followers_url: String,
    val following_url: String,
    val starred_url: String,
    val gists_url: String,
    val type: String,
    val score: Int
)

data class Result(val total_count: Int, val incomplete_results: Boolean, val items: List<User>)