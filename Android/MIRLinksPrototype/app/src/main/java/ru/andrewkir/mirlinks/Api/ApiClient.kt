package ru.andrewkir.mirlinks.Api

import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.gson.GsonConverterFactory
import ru.andrewkir.mirlinksgreen.api.ApiClientService

object ApiClient {
    val instance: ApiClientService by lazy{
        val retrofit = Retrofit.Builder()
            .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .baseUrl("https://api.yar.cx")
            .build()
        retrofit.create(ApiClientService::class.java)
    }
}