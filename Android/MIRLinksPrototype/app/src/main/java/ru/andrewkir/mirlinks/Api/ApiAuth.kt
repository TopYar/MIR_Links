package ru.andrewkir.mirlinks.Api

import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.gson.GsonConverterFactory

object ApiAuth {
    val instance: ApiAuthService by lazy{
        val retrofit = Retrofit.Builder()
            .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .baseUrl("https://yar.cx/links/")
            .build()
        retrofit.create(ApiAuthService::class.java)
    }
}