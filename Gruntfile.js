module.exports = function (grunt) {
    grunt.initConfig({
        typescript: {
            main: {
                src: ["src/*.ts"],
                dest: "dest",
                options: {
                    basePath: 'src',
                    noImplicitAny: true,
                    target: "ES5",
                    sourceMap: true,
                    declaration: true,
                    comments: true
                }
            }
        },
        tslint: {
            options: {
               formatter: "prose",
                configuration: grunt.file.readJSON("tslint.json")
            },
            files: {
                src: ["src/*.ts"]
            }
        },
        typedoc: {
            main: {
                src: ["src/*.ts"],
                options: {
                    name: "Jaid - Jane Indexed Database library",
                    target: "ES5",
                    out: "./docs/reference"
                    // readme: "none"
                }
            }
        },
        closurecompiler: {
            main: {
                files: {
                    "dest/jaid.min.js": ["dest/jaid.js"]
                },
                options: {
                    "compilation_level": "SIMPLE_OPTIMIZATIONS",
                    "language_in": "ECMASCRIPT5",
                    "max_processes": 5
                }
            }
        }
    });

    grunt.registerTask("default", ["typescript:main"]);
    grunt.registerTask("docs", ["typedoc:main"]);
    grunt.registerTask("minify", ["closurecompiler:main"]);
    grunt.registerTask("publish", ["typedoc:main", "closurecompiler:main"]);

    grunt.loadNpmTasks("grunt-typescript");
    grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks("grunt-typedoc");
    grunt.loadNpmTasks("grunt-closurecompiler");
};