import java.util.Properties
import java.io.File

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

// 签名口令不写进仓库：本地在仓库根目录放 keystore.properties，CI 由工作流重写本文件里的占位符。
// 文件格式（与 build.gradle.kts 同级目录或仓库根目录均可）：
//   storePassword=xxx
//   keyAlias=xxx
//   keyPassword=xxx
val keystoreProperties = Properties().apply {
    val candidates = listOf(
        File(rootProject.projectDir, "../../../keystore.properties"),
        File(rootProject.projectDir, "keystore.properties"),
    )
    val propFile = candidates.firstOrNull { it.exists() }
    if (propFile != null) propFile.inputStream().use { load(it) }
}
fun keystoreValue(key: String, fallback: String): String =
    keystoreProperties.getProperty(key)?.takeIf { it.isNotBlank() } ?: fallback

android {
    compileSdk = 36
    namespace = "com.lzyrecipe.recipes"
    signingConfigs {
        create("release") {
            storeFile = file("../../../../lzyrecipe.keystore")
            // 占位符由 GitHub Actions 用 Secrets 替换；本地通过 keystore.properties 提供
            storePassword = keystoreValue("storePassword", "KEYSTORE_PASSWORD")
            keyAlias = keystoreValue("keyAlias", "KEY_ALIAS")
            keyPassword = keystoreValue("keyPassword", "KEY_PASSWORD")
        }
    }
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.lzyrecipe.recipes"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")